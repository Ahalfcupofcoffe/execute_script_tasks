'use strict';

const XLXS = require('xlsx');
const path = require('path');

module.exports = (app, taskInfo) => {
    return {
        taskInfo: {
            ...taskInfo
        },

        async task(app) {
            const readInputDir = this.taskInfo.input;
            const mp4FileDirs = [];
            try {
                app.logger.debug(`开始扫描媒资数据，扫描目录：${readInputDir}`);
                // 检测目录
                await app.checkExistence(readInputDir);
                // 读取目录
                const dirNames = await app.readDir(readInputDir);
                let totalCounts = dirNames.length;
                app.logger.debug(`所需完成扫描的总媒资数据：${totalCounts}条`);
                // 遍历目录
                for (const dirName of dirNames) {
                    // 拿到每个目录名再与目录合并得到目录路径
                    const resourceDir = path.join(readInputDir, dirName);
                    // 检测目录下是否含有文件
                    if (! await app.checkDir(resourceDir)) {
                        app.logger.debug(`扫描目录：${readInputDir}下有文件存在，文件路径：${resourceDir}`);
                        continue;
                    }
                    // 在读取目录获取MP4文件
                    app.logger.debug(`扫描目录：${readInputDir}完成，开始读取深层目录：${resourceDir}`);
                    const fileNames = await app.readDir(resourceDir);
                    app.logger.debug(`扫描深层目录(${resourceDir})成功，开始遍历深层目录，获取MP4文件`);
                    for (const fileName of fileNames) {
                        // 获取文件名后缀
                        const fileNameSuffix = path.extname(fileName);
                        // 根据文件名后缀过滤非MP4文件
                        if (fileNameSuffix !== this.taskInfo.suffix) {
                            continue;
                        }
                        // 经过过滤后拿到每个MP4文件名再与目录合并得到文件路径
                        const mp4FileDir = path.join(resourceDir, fileName);
                        mp4FileDirs.push(mp4FileDir);
                    }
                }
                app.logger.debug(`扫描目录(${readInputDir})，获取MP4文件成功`);
            } catch (e) {
                app.logger.error(`执行扫描媒资数据提取MP4文件路径任务失败，错误信息：${e}`);
                throw new Error(e);
            }

            // 进入下一阶段（复制MP4文件）
            const outputDir = this.taskInfo.output;

            try {
                app.logger.debug(`开始复制MP4文件`);
                await app.checkExistence(outputDir);
                // 遍历扫描媒资数据后提取的MP4文件路径
                for (const mp4FileDir of mp4FileDirs) {
                    const oldMp4Path = mp4FileDir;
                    // 获取MP4路径最后部分
                    const mp4FileName = path.basename(oldMp4Path);
                    const newMp4Path = path.join(outputDir, mp4FileName);
                    app.logger.debug(`进行MP4文件复制，旧MP4文件目录：${oldMp4Path}，新MP4文件目录：${newMp4Path}`);
                    await app.cpFile(oldMp4Path, newMp4Path);
                }
            } catch (e) {
                app.logger.error(`MP4文件复制失败，错误信息：${e}`);
                throw new Error(e);
            }

            app.logger.info('MP4文件复制任务圆满完成~~~');
        }
    }
};