'use strict';

const XLXS = require('xlsx');
const path = require('path');

class MediaData {
    constructor() {
        this.outMediaData = [];
        this.errJsonFile = [];
        this.errMediaData = [];
    }
}


module.exports = (app, taskInfo) => {
    return {
        taskInfo: {
            ...taskInfo
        },
        mediaData: null,

        async task(app) {
            const readInputDir = this.taskInfo.input;
            this.mediaData = new MediaData();
            let mediaFlag = this.taskInfo.flag;
            app.logger.debug(`开始媒资数据导出，导出目录：${readInputDir}`);
            try {
                await app.checkExistence(readInputDir);
                const resourceDirs = await app.readDir(readInputDir);
                let totalCount = resourceDirs.length;
                let indexCount = 0, successCount = 0, errCount = 0;
                const indexLen = 100;
                app.logger.debug(`所需完成的总媒资数据：${totalCount}条`);
                for (const resourceDir of resourceDirs) {
                    const fileDir = path.join(readInputDir, resourceDir);
                    await app.checkExistence(fileDir);
                    if (! await app.checkDir(fileDir)) {
                        app.logger.debug(`扫描目录：${readInputDir}下有文件存在，非目录跳过，文件路径：${fileDir}`);
                        continue;
                    }
                    let files = await app.readDir(fileDir);
                    let jsonFiles = files.filter((file) => {
                        return this.mateJson(file)
                    });
                    if (jsonFiles.length !== 1) {
                        // 多份或者没有JSON文件的，先跳过遍历，然后记录下来
                        this.mediaData.errJsonFile.push({'所在目录': fileDir, '错误提示': '没有或多于一个JSON文件'});
                        indexCount++;
                        errCount++;
                        if (indexCount % indexLen === 0 || indexCount === totalCount) app.logger.debug(`当前完成的总媒资数据：${indexCount}条`);
                        continue;
                    }
                    let jsonFilePath = path.join(fileDir, jsonFiles[0]);
                    await app.checkFile(jsonFilePath);
                    let jsonContent = await app.readFile(jsonFilePath, {'encoding': 'utf8'});
                    let content = JSON.parse(jsonContent);
                    let sortMediaItem = {};
                    let mediaItem = false;
                    if (mediaFlag == 'song') {
                        mediaItem = await this.converterSongJsonData(content);
                    } else if (mediaFlag == 'mv') {
                        mediaItem = await this.converterMvJsonData(content);
                    }
                    if (mediaFlag == 'song') {
                        sortMediaItem['歌名'] = content['song_name'] || false;
                    }
                    if (mediaFlag == 'mv') {
                        sortMediaItem['歌名'] = content['mv_name'] || false;
                    }
                    if (Object.prototype.toString.call(mediaItem) !== '[object Object]' || !sortMediaItem) {
                        // 出现不可预期的JSON数据，先跳过遍历，然后记录下来
                        this.mediaData.errMediaData.push({'所在目录': fileDir, '错误提示': '出现不可预期的JSON数据字段', '字段名': mediaItem});
                        indexCount++;
                        errCount++;
                        if (indexCount % indexLen === 0 || indexCount === totalCount) app.logger.debug(`当前完成的总媒资数据：${indexCount}条`);
                        continue;
                    }
                    // 新增字段
                    sortMediaItem['所在目录'] = fileDir;
                    mediaItem['读取文件目录地址'] = jsonFilePath;
                    mediaItem = Object.assign(sortMediaItem, mediaItem);
                    this.mediaData.outMediaData.push(mediaItem);
                    indexCount++;
                    successCount++;
                    if (indexCount % indexLen === 0 || indexCount === totalCount) app.logger.debug(`当前完成的总媒资数据：${indexCount}条`);
                }
                app.logger.debug(`已完成所有的媒资数据，当前成功媒资数据：${successCount}条，当前错误媒资数据：${errCount}条`);
                let sheets = {};
                let sheetNames = [];
                let sheetName = 'shell1';
                if (this.mediaData.outMediaData.length > 0) {
                    app.logger.debug('开始导出媒资数据表');
                    let mediaDataJson = XLXS.utils.json_to_sheet(this.mediaData.outMediaData); //通过工具将json转表对象
                    sheetNames.push(sheetName);
                    if (!sheets[sheetName]) sheets[sheetName] = Object.assign({}, mediaDataJson);
                    await app.generateExcel(sheetNames, sheets, this.taskInfo.output);
                    app.logger.debug(`导出媒资数据表成功`);
                } else {
                    app.logger.error(`没有可导出的媒资数据`);
                }

                // 错误处理
                if (this.taskInfo.errOutputPrint) {
                    if (this.mediaData.errJsonFile.length > 0) {
                        app.logger.error(`没有或多于一个JSON文件，目录有以下：\r\n${this.mediaData.errMediaData.map(function (currentValue) {
                            return JSON.stringify(currentValue);
                        }).join(',\n\r')}`);
                    }
                    if (this.mediaData.errMediaData.length > 0) {
                        app.logger.error(`出现不可预期的JSON数据字段，目录有以下：\r\n${this.mediaData.errMediaData.map(function (currentValue) {
                            return JSON.stringify(currentValue);
                        }).join(',\n\r')}`);
                    }
                    sheets = {};
                    // 这里要置空
                    sheetNames = [];
                    let outErrMediaData = this.mediaData.errJsonFile.concat(this.mediaData.errMediaData);
                    if (outErrMediaData.length > 0) {
                        app.logger.debug('开始导出错误媒资数据表');
                        let errMediaDataJson = XLXS.utils.json_to_sheet(outErrMediaData); //通过工具将json转表对象
                        sheetNames.push(sheetName);
                        if (!sheets[sheetName]) sheets[sheetName] = Object.assign({}, errMediaDataJson);
                        await app.generateExcel(sheetNames, sheets, this.taskInfo.errExcelFilePath);
                        app.logger.debug('导出错误媒资数据表成功')
                    }
                }
                app.logger.debug(`完成媒资数据导出，导出目录：${this.taskInfo.output}`);
            } catch (err) {
                app.logger.error(`执行导出媒资数据表失败，错误信息(${err})`);
            }
        },

        converterSongJsonData(content) {
            let mediaItem = {};
            for (let key in content) {
                if (!content.hasOwnProperty(key)) continue;
                if (key == 'video_duration') continue;
                let val = content[key];
                if (key == 'has_captions') {
                    val = this.verbalization[key](val);
                    if (!val) {
                        // 出现未知字段值，直接跳过
                        mediaItem = false;
                        return mediaItem;
                    }
                    mediaItem['是否有字幕'] = val;
                } else if (key == 'version') {
                    mediaItem['版本'] = val;
                } else if (key == 'language') {
                    mediaItem['语言'] = val;
                } else if (key == 'kmid') {
                    mediaItem['文件名'] = val;
                } else if (key == 'duration') {
                    mediaItem['时长'] = val;
                } else if (key == 'song_name') {
                    mediaItem['歌名'] = val;
                } else if (key == 'tags') {
                    mediaItem['类型'] = val;
                } else if (key == 'singer_name') {
                    mediaItem['歌手'] = val.join(',');
                } else if (key == 'has_lrc') {
                    val = this.verbalization[key](val);
                    if (!val) {
                        // 出现未知字段值，直接跳过
                        mediaItem = false;
                        return mediaItem;
                    }
                    mediaItem['有没有歌词'] = val;
                } else {
                    mediaItem = false;
                    // 出现未知字段，直接跳过
                    break;
                }
            }
            return mediaItem
        },

        converterMvJsonData(content) {
            let mediaItem = {};
            for (let key in content) {
                if (!content.hasOwnProperty(key)) continue;
                let val = content[key];
                if (key == 'version') {
                    mediaItem['版本'] = val;
                } else if (key == 'language') {
                    mediaItem['语言'] = val;
                } else if (key == 'k_mv_id') {
                    mediaItem['文件名'] = val;
                } else if (key == 'video_duration') {
                    // 取秒做单位
                    mediaItem['时长'] = (val / 1000);
                } else if (key == 'mv_name') {
                    mediaItem['歌名'] = val;
                } else if (key == 'tags') {
                    mediaItem['类型'] = val;
                } else if (key == 'singer_name') {
                    mediaItem['歌手'] = val.join(',');
                } else {
                    mediaItem = false;
                    // 出现未知字段，直接跳过
                    break;
                }
            }
            mediaItem['是否有字幕'] = '无字幕';
            mediaItem['有没有歌词'] = '无歌词';
            return mediaItem
        },

        verbalization: {
            'has_lrc': function (val) {
                switch (val) {
                    case 0:
                        return '无歌词';
                    case 1:
                        return '有歌词';
                    default:
                        return false;
                }
            },
            'has_captions': function (val) {
                switch (val) {
                    case 0:
                        return '未知';
                    case 1:
                        return '无字幕';
                    case 2:
                        return '有字幕';
                    default:
                        return false;
                }
            }
        },

        mateJson(filePath) {
            return filePath.indexOf('.json') !== -1;
        }
    }
};