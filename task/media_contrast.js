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
            let contrastDirs = this.taskInfo.contrast_dirs;
            let writeOutputDir = this.taskInfo.output;
            try {
                if (!app.isArray(readInputDirs)) readInputDirs = [readInputDirs];
                const readMediaData = await app.readDirsInfo(readInputDirs);
                if (!app.isArray(contrastDirs)) contrastDirs = [contrastDirs];
                const contrastMediaData = await app.readExcels(contrastDirs);
                const contrastMediaLength = contrastMediaData.length;
                app.logger.debug(`需要对比的媒资数据：${contrastMediaLength}条`);
                let mediaKmIds = await this.getMediaKmId(readMediaData);
                let mediaContrastResData = contrastMediaData.filter((contrastMediaItem, contrastMediaIndex) => {
                    app.logger.debug(`当前媒资数据比对进度：${parseInt((contrastMediaIndex / (contrastMediaLength - 1)) * 100)}%`);
                    return this.matchingMediaData(contrastMediaItem, mediaKmIds);
                });
                let sheetNames = [];
                let sheetName = 'shell1';
                sheetNames.push(sheetName);
                let sheets = {};
                if (!sheets[sheetName]) sheets[sheetName] = XLXS.utils.json_to_sheet(mediaContrastResData);
                await app.generateExcel(sheetNames, sheets, writeOutputDir);
                app.logger.debug(`执行媒资数据对比生成对比结果表成功`);
            } catch (err) {
                app.logger.error(`执行媒资数据对比生成对比结果表失败，错误信息(${err})`);
            }
        },

        async getMediaKmId(mediaDirs) {
            let mediaKmId = [];
            for (let mediaDir of mediaDirs) {
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
                mediaKmId.push(jsonContent.kmid);
            }
            return mediaKmId;
        },

        matchingMediaData(contrastMediaItem, mediaKmIds) {
            return !mediaKmIds.includes(contrastMediaItem.kmid);
        },

        mateJson(fileName) {
            return path.extname(fileName) === '.json';
        }
    }
};