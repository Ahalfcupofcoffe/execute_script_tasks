'use strict';

const XLXS = require('xlsx');
const path = require('path');

module.exports = (app, taskInfo) => {
    return {
        taskInfo: {
            ...taskInfo
        },

        async task(app) {
            try {
                let readInputDir = this.taskInfo.input;
                let writeOutputDir = this.taskInfo.output;
                if (!readInputDir) {
                    app.logger.error(`执行媒资数据表转化为合并音频视频媒资数据表失败，没有指定媒资数据表所在目录`);
                    return;
                }
                app.logger.debug(`开始读取媒资数据表目录，所在目录：${readInputDir}`);
                let mediaData = [];
                let mediaDataResourceNames = await app.readDir(readInputDir);
                mediaDataResourceNames = mediaDataResourceNames.sort(function (a, b) {
                    return parseInt(a.split('_')[3]) - parseInt(b.split('_')[3]);
                });
                for (let mediaDataResourceName of mediaDataResourceNames) {
                    const mediaDataResourceDir = path.join(readInputDir, mediaDataResourceName);
                    mediaData = await app.readExcel(mediaDataResourceDir);
                    mediaData = mediaData.map((mediaItem) => {
                        return {
                            '歌名': mediaItem['歌名'],
                            '所在目录': mediaItem['所在目录'],
                            '合并结果': '',
                            '合并耗时': ''
                        };
                    });
                    const mediaDataFileDir = path.join(writeOutputDir, mediaDataResourceName);
                    let sheets = {};
                    let sheetNames = [];
                    let sheetName = 'shell1';
                    let mediaDataJson = XLXS.utils.json_to_sheet(mediaData); //通过工具将json转表对象
                    sheetNames.push(sheetName);
                    if (!sheets[sheetName]) sheets[sheetName] = Object.assign({}, mediaDataJson);
                    await app.generateExcel(sheetNames, sheets, mediaDataFileDir);
                    app.logger.debug(`生成视频音频合并媒资数据表成功，表名：${path.basename(mediaDataFileDir)}`);
                }
            } catch (err) {
                app.logger.error(`执行媒资数据表转化为合并音频视频媒资数据表失败，错误信息(${err.stack})`);
            }
        }
    };
};