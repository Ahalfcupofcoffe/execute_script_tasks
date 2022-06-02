'use strict';

const XLXS = require('xlsx');
const path = require('path');

module.exports = (app, taskInfo) => {
    return {
        taskInfo: {
            ...taskInfo
        },

        async task(app) {
            let readScansDirs = this.taskInfo.scans;
            let readInputDir = this.taskInfo.input;
            let writeOutputDir = this.taskInfo.output;
            let totalMediaData = [];
            try {
                if (!app.isArray(readScansDirs)) readScansDirs = [readScansDirs];
                let roundNum = 1;
                let roundLength = readScansDirs.length;
                app.logger.debug(`开始媒资数据扫描，共${roundLength}轮`);
                // 先读取所有的全量媒资数据
                totalMediaData = await app.readExcel(readInputDir);
                for (const readScansDir of readScansDirs) {
                    // 然后扫描目录，把目录的每条媒资数据去和总媒资数据比对，如果在总媒资数据里有，就把那条删掉，剩下的就都是缺失的媒资数据了
                    totalMediaData = await this.mediaCatalogueDefectScans(totalMediaData, readScansDir, roundNum);
                    roundNum++;
                }
                app.logger.debug(`准备生成媒资数据缺失表`);
                let sheetNames = [];
                let sheetName = 'shell1';
                sheetNames.push(sheetName);
                let sheets = {};
                if (!sheets[sheetName]) sheets[sheetName] = XLXS.utils.json_to_sheet(totalMediaData);
                await app.generateExcel(sheetNames, sheets, writeOutputDir);
                app.logger.debug(`生成媒资数据缺失表成功`);
            } catch (err) {
                app.logger.error(`执行所有目录扫描且生成媒资数据缺失表失败，错误信息(${err})`);
            }
        },

        async mediaCatalogueDefectScans(totalMediaData, readScansDir, roundNum) {
            app.logger.debug(`开始第${roundNum}轮媒资数据扫描，扫描目录：${readScansDir}`);

            try {
                await app.checkExistence(readScansDir);
                const resourceDirs = await app.readDir(readScansDir);
                let totalCount = resourceDirs.length;
                app.logger.debug(`该轮所需完成扫描的总媒资数据：${totalCount}条`);
                for (const resourceDir of resourceDirs) {
                    const fileDir = path.join(readScansDir, resourceDir);
                    if (! await app.checkDir(fileDir)) {
                        app.logger.debug(`扫描目录：${readScansDir}下有文件存在，文件路径：${fileDir}`);
                        continue;
                    }
                    // 拿到目录名
                    const catalogueName = path.basename(fileDir);
                    let filterCount = 0;
                    totalMediaData = totalMediaData.filter(function (currentValue) {
                        if (currentValue['伴奏MID'] !== catalogueName) return currentValue;
                        filterCount++;
                    });
                    switch (filterCount) {
                        case 0:
                            app.logger.error(`扫描目录：${fileDir}已不在总媒资数据表里，异常`);
                            break;
                        case 1:
                            app.logger.debug(`扫描目录：${fileDir}已在总媒资数据表里剔除，正常`);
                            break;
                        default:
                            app.logger.error(`扫描目录：${fileDir}在总媒资数据表里重复出现，异常`);
                            break;
                    }
                }
            } catch (err) {
                app.logger.error(`执行第${roundNum}轮媒资数据扫描失败，扫描目录：${readScansDir}，错误信息：${err}`);
                throw new Error(err);
            }
            app.logger.debug(`完成第${roundNum}轮媒资数据扫描`);
            return totalMediaData;
        },
    }
};