'use strict';

const XLXS = require('xlsx');
const path = require('path');

module.exports = (app, taskInfo) => {
    return {
        taskInfo: {
            ...taskInfo
        },
        mediaData: null,

        async task(app) {
            const readFrontDir = this.taskInfo.frontInput;
            const readAfterDir = this.taskInfo.afterInput;
            const outputDir = this.taskInfo.output;
            const outputMergeMedia = [];

            app.logger.debug(`开始媒资数据表合并，合并目录：${readFrontDir} ———— ${readAfterDir}`);
            try {
                await app.checkExistences(readFrontDir, readAfterDir);
                // 读取前媒资数据表
                const frontMediaJson = await app.readExcel(readFrontDir);
                // 过滤掉未合并的视频
                const filterFrontMedia = frontMediaJson.filter(function (cur) {
                    if (cur['合并结果'] == 'success') return cur;
                });
                // 读取后媒资数据表
                const afterMediaJson = await app.readExcel(readAfterDir);
                for (const itemAfterMedia of afterMediaJson) {
                    const afterSongId = itemAfterMedia['文件名'];
                    const afterSongName = itemAfterMedia['歌名'];
                    const afterSongDir = itemAfterMedia['所在目录'];
                    let deleteIndex = 0;
                    let isSaveMedia = true;
                    for (const itemFrontMedia of filterFrontMedia) {
                        const frontSongDir = itemFrontMedia['所在目录'];
                        const frontSongId = path.basename(frontSongDir);
                        const frontSongName = itemFrontMedia['歌名'];
                        const frontSongMergeResult = itemFrontMedia['合并结果'];
                        const frontSongMergeTime = itemFrontMedia['合并耗时'];
                        if (frontSongId === afterSongId || frontSongName === afterSongName) {
                            outputMergeMedia.push({'歌名': afterSongName, '所在目录': afterSongDir, '合并结果': frontSongMergeResult, '合并耗时': frontSongMergeTime});
                            // app.logger.debug(`歌名：${frontSongName}，歌曲ID：${frontSongId}已合并过视频，无需再合并，跳过`);
                            // 还需删除下
                            filterFrontMedia.splice(deleteIndex, 1);
                            isSaveMedia = false;
                            break;
                        }
                        deleteIndex++;
                    }
                    if (isSaveMedia) {
                        outputMergeMedia.push({'歌名': afterSongName, '所在目录': afterSongDir, '合并结果': '', '合并耗时': ''});
                    }
                }
                let sheetNames = [];
                let sheetName = 'shell1';
                sheetNames.push(sheetName);
                let sheets = {};
                if (!sheets[sheetName]) sheets[sheetName] = XLXS.utils.json_to_sheet(outputMergeMedia);
                await app.generateExcel(sheetNames, sheets, this.taskInfo.output);
                app.logger.debug(`完成媒资数据表合并，合并目录：${readFrontDir} ———— ${readAfterDir}`);
            } catch (err) {
                app.logger.error(`执行媒资数据表合并失败，错误信息(${err})`);
            }
        }
    }
};