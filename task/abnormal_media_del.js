'use strict';

const XLXS = require('xlsx');
const path = require('path');

module.exports = (app, taskInfo) => {
    return {
        taskInfo: {
            ...taskInfo,
        },

        async task(app) {
            app.logger.debug(`开始媒资数据对比`);
            let readInputDirs = this.taskInfo.inputs;
            let delDirs = this.taskInfo.delete_dirs;
            let writeOutputDir = this.taskInfo.output;
            try {
                if (!app.isArray(readInputDirs)) readInputDirs = [readInputDirs];
                const readMediaData = await app.readDirsInfo(readInputDirs);
                if (!app.isArray(delDirs)) delDirs = [delDirs];
                const delMediaData = await app.readExcels(delDirs);
                const delMediaLength = delMediaData.length;
                app.logger.debug(`需要删除的媒资数据：${delMediaLength}条`);
                let mediaDirs = await this.kmIdFilter(readMediaData);
                // 排重下
                mediaDirs = [...new Set(mediaDirs)];
                let mediaDelOmission = delMediaData.filter((delMediaItem, delMediaIndex) => {
                    app.logger.debug(`当前媒删除媒资进度：${parseInt((delMediaIndex / (delMediaLength - 1)) * 100)}%`);
                    let isExistence = false;
                    for (let mediaDir of mediaDirs) {
                        const lastName = path.basename(mediaDir);
                        const dirName = path.dirname(mediaDir);
                        if (lastName === delMediaItem.kmid) {
                            app.deleteFolder(path.join(dirName, delMediaItem.kmid));
                            isExistence = true;
                            app.logger.debug(`删除媒资数据成功，kmid：${delMediaItem.kmid}`);
                            break;
                        }
                    }
                    if (!isExistence) {
                        app.logger.debug(`删除媒资数据失败，kmid：${delMediaItem.kmid}`);
                        return true;
                    }
                });
                app.logger.debug(`执行删除媒资数据成功`);
                if (mediaDelOmission.length === 0) return;
                app.logger.debug(`删除媒资后发现有残留，即将生成媒资数据表`);
                let sheetNames = [];
                let sheetName = 'shell1';
                sheetNames.push(sheetName);
                let sheets = {};
                if (!sheets[sheetName]) sheets[sheetName] = XLXS.utils.json_to_sheet(mediaDelOmission);
                await app.generateExcel(sheetNames, sheets, writeOutputDir);
                app.logger.debug(`生成删除后残留媒资数据表成功`);
            } catch (err) {
                app.logger.error(`执行删除媒资数据失败，错误信息(${err})`);
            }
        },

        async kmIdFilter(mediaDirs) {
            let filterMediaData = [];
            for (let mediaDir of mediaDirs) {
                const dir =  path.dirname(mediaDir);
                let files = await app.readDir(mediaDir);
                let jsonFile = files.filter((file) => {
                    return this.mateJson(file);
                });
                let jsonFilePath = path.join(mediaDir, jsonFile[0]);
                let jsonFileContent = await app.readFile(jsonFilePath, {'encoding': 'utf8'});
                let jsonContent;
                try {
                    jsonContent = JSON.parse(jsonFileContent);
                } catch (err) {
                    app.logger.error(`解析JSON数据失败，JSON内容：${jsonFileContent}，JSON路径：${jsonFilePath}，错误信息：${err}`);
                    jsonContent = {};
                }
                try {
                    if (!await app.checkDir(path.join(dir, jsonContent.kmid))) continue;
                    filterMediaData.push(mediaDir);
                } catch (err) {
                    app.logger.error(`检查kmid所在目录对应关系失败，kmid：${jsonContent.kmid}，所在目录：${mediaDir}`);
                }
            }
            return filterMediaData;
        },

        mateJson(fileName) {
            return path.extname(fileName) === '.json';
        }
    }
};