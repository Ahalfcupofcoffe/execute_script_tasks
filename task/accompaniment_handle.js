'use strict';

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

const async = require('async');
const moment = require('moment');

const scanningCatalogues = require('./scanning_catalogues.js');

module.exports = (app, taskInfo) => {
    return {
        taskInfo: {
            ...taskInfo
        },

        async task(app) {
            try {
                await this.filter();
                await this.merge();
            } catch (err) {
                app.logger.error(`处理K歌媒资数据伴奏文件出错，错误信息(err:${err})`);
                return;
            }

            app.logger.debug(`K个媒资数据伴奏文件处理完成，准备K歌全量媒资数据扫描`);

            await this.scanning();
        },

        // 过滤
        async filter() {
            let that = this;
            let filterCatalogues = this.taskInfo.filterCatalogues;
            for (let filterDir of filterCatalogues) {
                let subDirs = await app.readDirInfo(filterDir);
                await new Promise((resolve, reject) => {
                    let queue = async.queue(function (subDir, next) {
                        // 读取子目录
                        let fileDirs = app.readDirInfoSync(subDir);
                        let filterFileDirs = [];
                        fileDirs.forEach(fileDir => {
                            let fileExtname = path.basename(fileDir);
                            if (!that.matchingNewAccom(fileExtname)) return;
                            filterFileDirs.push(fileDir);
                        });
                        // 不满足过滤条件的就直接跳到下一条媒资
                        if (filterFileDirs.length <= 1) return next(null, subDir);

                        // 按正常情况，只会有两个伴奏文件，出现第三个，先不处理，打印出来看看先
                        if (filterFileDirs.length > 2) {
                            app.logger.debug(`当前目录(${filterDir})下子目录(${subDir})执行过滤任务出现伴奏文件超出意想之外的情况，伴奏文件数共：(${filterFileDirs.length}个)，保留改媒资暂不处理`);
                            return next(null, subDir);
                        }

                        // 文件修改离现在最早时间
                        let fileModifyEarliestTime = null;
                        // 简单排序下，只需要保证数组中第一个值的文件修改时间在整个数据里是最早的
                        filterFileDirs.forEach((filterFileDir, index) => {
                            let fileStats = fs.statSync(filterFileDir);
                            let fileModifyTime = moment(fileStats.mtime);
                            if (!fileModifyEarliestTime) {
                                fileModifyEarliestTime = fileModifyTime;
                                return;
                            }
                            // 如果第一个索引的文件修改时间不在接下来的文件修改时间之后，则换位
                            if (fileModifyEarliestTime.isAfter(fileModifyTime, 'day')) return;

                            let fileModifyEarliestDir = filterFileDir;
                            filterFileDirs[index] = filterFileDirs[0];
                            filterFileDirs[0] = fileModifyEarliestDir;
                            fileModifyEarliestTime = fileModifyTime;
                        });

                        // 移除数组中第一个元素
                        filterFileDirs.shift();
                        // 开始过滤
                        filterFileDirs.forEach((filterFileDir) => {
                            // 删除文件
                            fs.unlinkSync(filterFileDir);
                        });
                        next(null, subDir);
                    }, 6);

                    queue.drain(() => {
                       app.logger.debug(`当前目录(${filterDir})过滤伴奏任务完成`);
                       resolve();
                    });

                    queue.push(subDirs, (err, taskDir) => {
                        if (err) return app.logger.error(`当前目录(${filterDir})下子目录(${taskDir})执行过滤任务失败，错误信息(err:${err})`);
                        app.logger.debug(`当前目录(${filterDir})下子目录(${taskDir})执行过滤任务成功`);
                    });

                    queue.error((err, taskDir) => {
                       if (err) {
                           queue.pause();
                           return reject(err);
                       }
                       app.logger.debug(`当前目录(${filterDir})下子目录(${taskDir})执行过滤任务成功`);
                    });
                });
            }
        },

        // 合并
        async merge() {
            let mergeTargetCatalogues = this.taskInfo.mergeTargetCatalogues;
            let mergeSourcesCatalogues = this.taskInfo.mergeSourcesCatalogues;
            let mergeTargetData = {};
            let err = null;

            for (let mergeTargetDir of mergeTargetCatalogues) {
                let subTargetDirs = await app.readDirInfo(mergeTargetDir);
                subTargetDirs.forEach(subTargetDir => {
                    let targetDirName = path.basename(subTargetDir);
                    if (mergeTargetData[targetDirName]) {
                        err = new Error(`重复目录名：${targetDirName}`);
                        throw err;
                    }
                    // {'000SGc0C2Eo2yZ': {'curDirPath': 'D:\\work\\project\\k歌媒资脚本\\top_1590_20220411\\000SGc0C2Eo2yZ', 'copyTargetPaths': ['xxx.mp4', 'xxx.mp3', ...]}}
                    mergeTargetData[targetDirName] = {
                        curDirPath: subTargetDir,
                        copyTargetPaths: app.readDirInfoSync(subTargetDir)
                    };
                });
                if (err) throw err;
            }

            for (let mergeSourceDir of mergeSourcesCatalogues) {
                let subSourceDirs = await app.readDirInfo(mergeSourceDir);
                for (let subSourceDir of subSourceDirs) {
                    let sourceDirName = path.basename(subSourceDir);
                    if (!mergeTargetData[sourceDirName]) continue;

                    // copy 合并
                    let curDirPath = mergeTargetData[sourceDirName].curDirPath;
                    let copyTargetPaths = mergeTargetData[sourceDirName].copyTargetPaths;
                    app.logger.debug(`准备从源目录(${curDirPath})合并到目标目录(${subSourceDir})`);
                    for (let copyTargetPath of copyTargetPaths) {
                        let copyTargetFileName = path.basename(copyTargetPath);
                        let copySourceFileDir = path.join(subSourceDir, copyTargetFileName);
                        try {
                            await fsPromises.copyFile(copyTargetPath, copySourceFileDir);
                        } catch (err) {
                            app.logger.error(`源文件路径(${copyTargetPath})复制到目标文件路径(${copySourceFileDir})失败，跳过改目录(${sourceDirName})合并，错误信息(err:${err})`);
                            break;
                        }
                        app.logger.debug(`源文件路径(${copyTargetPath})复制到目标文件路径(${copySourceFileDir})成功`);
                    }

                }
            }
        },

        // 扫描
        async scanning() {
            try {
                const scanningCataloguesModule = scanningCatalogues(app, taskInfo);
                await scanningCataloguesModule.task(app);
            } catch (err) {
                app.logger.error(`执行K歌全量媒资数据扫描失败，错误信息(${err})`);
                return;
            }
            app.logger.debug(`执行K歌全量媒资数据扫描成功`);
        },

        matchingNewAccom(fileName) {
            return /^(128)(?=accom)/.test(fileName);
        }
    };
};