'use strict';

const XLXS = require('xlsx');
const path = require('path');
const moment = require('moment');

module.exports = (app, taskInfo) => {
    return {
        taskInfo: {
            ...taskInfo,
            getOutputName: function(now, catalogueName) {
                return `media_${now}_${catalogueName}.xlsx`;
            }
        },



        async task(app) {
            let readInputDirs = this.taskInfo.inputs;
            try {
                if (!app.isArray(readInputDirs)) readInputDirs = [readInputDirs];
                let roundNum = 1;
                let roundLength = readInputDirs.length;
                app.logger.debug(`开始媒资数据扫描，共${roundLength}轮`);
                for (const readInputDir of readInputDirs) {
                    const catalogueName = path.basename(readInputDir);
                    let fileMediaData = await this.mediaFileScanning(readInputDir, roundNum);
                    fileMediaData = await this.filterNormalMedia(fileMediaData, roundNum);
                    fileMediaData = await this.filterAttribute(fileMediaData);
                    let resMediaData = await this.conversionScanningInfo(fileMediaData);
                    let sheetNames = [];
                    let sheetName = 'shell1';
                    sheetNames.push(sheetName);
                    let sheets = {};
                    if (!sheets[sheetName]) sheets[sheetName] = XLXS.utils.json_to_sheet(resMediaData);
                    const now = moment().format('YYYYMMDDHHmmss');
                    let writeOutputDirs = path.join(this.taskInfo.outputs, this.taskInfo.getOutputName(now, catalogueName));
                    await app.generateExcel(sheetNames, sheets, writeOutputDirs);
                    roundNum++;
                }
            } catch (err) {
                app.logger.error(`执行所有目录扫描且生成媒资信息表失败，错误信息(${err})`);
            }
        },

        async mediaFileScanning(readInputDir, roundNum) {
            let fileMediaData = [];
            app.logger.debug(`开始第${roundNum}轮媒资数据扫描，扫描目录：${readInputDir}`);

            try {
                await app.checkExistence(readInputDir);
                const resourceDirs = await app.readDir(readInputDir);
                let totalCount = resourceDirs.length;
                app.logger.debug(`该轮所需完成扫描的总媒资数据：${totalCount}条`);
                for (const resourceDir of resourceDirs) {
                    const fileDir = path.join(readInputDir, resourceDir);
                    if (! await app.checkDir(fileDir)) {
                        app.logger.debug(`扫描目录：${readInputDir}下有文件存在，文件路径：${fileDir}`);
                        continue;
                    }
                    let files = await app.readDir(fileDir);
                    let fileMediaItem = {
                        'kmid': resourceDir,
                        'song_name': '',
                        '目录名': fileDir
                    };
                    fileMediaItem = Object.assign(fileMediaItem, await this.scanningFile(files, resourceDir, fileDir));
                    fileMediaData.push(fileMediaItem);

                    let jsonFile = files.filter((file) => {
                        return this.mateJson(file)
                    });
                    if (jsonFile.length === 0) continue;
                    let jsonFilePath = path.join(fileDir, jsonFile[0]);
                    await app.checkExistence(jsonFilePath);
                    let jsonFileContent = await app.readFile(jsonFilePath, {'encoding': 'utf8'});
                    let jsonContent;
                    try {
                        jsonContent = JSON.parse(jsonFileContent);
                        fileMediaItem['JSON文件数据是否异常或为空'] = false;
                    } catch (err) {
                        app.logger.error(`解析JSON数据失败，JSON内容：${jsonFileContent}，JSON路径：${jsonFilePath}，错误信息：${err}`);
                        fileMediaItem['JSON文件数据是否异常或为空'] = true;
                        jsonContent = {};
                    }

                    fileMediaItem['song_name'] = jsonContent.song_name;
                }
            } catch (err) {
                app.logger.error(`执行第${roundNum}轮媒资数据扫描失败，扫描目录：${readInputDir}，错误信息：${err}`);
                throw new Error(err);
            }
            app.logger.debug(`完成第${roundNum}轮媒资数据扫描`);
            return fileMediaData;
        },

        async scanningFile(files, resourceDir, fileDir) {
            let fileFormatData = {
                '是否有json文件': 0,
                '是否有xml/lrc文件': 0,
                '是否有mp4': 0,
                '是否有m4a_accom': 0,
                '是否有m4a_org': 0,
                '是否有图片': 0,
                '是否有mv图片': 0,
                '是否是空目录': 0,
            };
            if (files.length === 0) {
                return fileFormatData;
            } else {
                fileFormatData['是否是空目录']++;
            }
            for (let file of files) {
                const fileSuffix = path.extname(file);
                if (fileSuffix === '.json') {
                    fileFormatData['是否有json文件']++;
                } else if (fileSuffix === '.xml' || fileSuffix === '.lrc') {
                    fileFormatData['是否有xml/lrc文件']++;
                } else if (fileSuffix === '.mp4') {
                    if (this.matchingNewMp4(file, resourceDir)) {
                        fileFormatData['是否有mp4']++;
                    } else {
                        app.logger.error(`未知格式MP4，打印一下文件名：${file}，所在目录：${fileDir}`)
                    }
                } else if (fileSuffix === '.m4a') {
                    if (this.matchingNewAccom(file)) {
                        fileFormatData['是否有m4a_accom']++;
                    } else if (this.matchingNewOrg(file)) {
                        fileFormatData['是否有m4a_org']++;
                    } else {
                        app.logger.error(`未知格式M4A，打印一下文件名：${file}，所在目录：${fileDir}`);
                    }
                } else if (fileSuffix === '.jpg' || fileSuffix === '.png') {
                    const fileName = path.parse(file).name;
                    if (fileName === resourceDir) {
                        fileFormatData['是否有图片']++;
                    } else if (this.matchingMvImg(file, resourceDir)) {
                        fileFormatData['是否有mv图片']++;
                    } else {
                        app.logger.error(`未知格式图片，打印一下文件名：${file}，所在目录：${fileDir}`);
                    }
                } else {
                    app.logger.error(`出现未知格式后缀，打印一下文件名：${file}，所在目录：${fileDir}`);
                }
            }
            return fileFormatData
        },

        async filterNormalMedia(mediaData) {
            const filterData = [];
            for (let mediaItem of mediaData) {
                let filterFlag = false;
                if (mediaItem['是否有json文件'] !== 1) {
                    filterFlag = true;
                } else if (mediaItem['是否有xml/lrc文件'] !== 1) {
                    filterFlag = true;
                } else if (mediaItem['是否有mp4'] !== 1) {
                    filterFlag = true;
                } else if (mediaItem['是否有m4a_accom'] !== 1) {
                    filterFlag = true;
                } else if (mediaItem['是否有m4a_org'] !== 1) {
                    filterFlag = true;
                } else if (mediaItem['是否有图片'] !== 1) {
                    filterFlag = true;
                } else if (mediaItem['是否有mv图片'] !== 1) {
                    filterFlag = true;
                } else if (mediaItem['是否是空目录'] !== 1) {
                    filterFlag = true;
                } else if (mediaItem['JSON文件数据是否异常或为空']) {
                    filterFlag = true;
                }

                if (!filterFlag) continue;

                filterData.push(mediaItem);
            }

            return filterData;
        },

        async filterAttribute(mediaData) {
            let filterData = [];

            let filterFlag = true;
            for (let mediaItem of mediaData) {
                if (mediaItem['是否有json文件'] !== 1) {
                    filterFlag = false;
                } else {
                    delete mediaItem['是否有json文件'];
                    filterData.push(mediaItem);
                }
            }
            if (filterFlag) {
                mediaData = filterData;
            }

            filterData = [];
            filterFlag = true;
            for (let mediaItem of mediaData) {
                if (mediaItem['是否有xml/lrc文件'] !== 1) {
                    filterFlag = false;
                } else {
                    delete mediaItem['是否有xml/lrc文件'];
                    filterData.push(mediaItem);
                }
            }
            if (filterFlag) {
                mediaData = filterData;
            }

            filterData = [];
            filterFlag = true;
            for (let mediaItem of mediaData) {
                if (mediaItem['是否有mp4'] !== 1) {
                    filterFlag = false;
                } else {
                    delete mediaItem['是否有mp4'];
                    filterData.push(mediaItem);
                }
            }
            if (filterFlag) {
                mediaData = filterData;
            }

            filterData = [];
            filterFlag = true;
            for (let mediaItem of mediaData) {
                if (mediaItem['是否有m4a_accom'] !== 1) {
                    filterFlag = false;
                } else {
                    delete mediaItem['是否有m4a_accom'];
                    filterData.push(mediaItem);
                }
            }
            if (filterFlag) {
                mediaData = filterData;
            }

            filterData = [];
            filterFlag = true;
            for (let mediaItem of mediaData) {
                if (mediaItem['是否有m4a_org'] !== 1) {
                    filterFlag = false;
                } else {
                    delete mediaItem['是否有m4a_org'];
                    filterData.push(mediaItem);
                }
            }
            if (filterFlag) {
                mediaData = filterData;
            }

            filterData = [];
            filterFlag = true;
            for (let mediaItem of mediaData) {
                if (mediaItem['是否有图片'] !== 1) {
                    filterFlag = false;
                } else {
                    delete mediaItem['是否有图片'];
                    filterData.push(mediaItem);
                }
            }
            if (filterFlag) {
                mediaData = filterData;
            }

            filterData = [];
            filterFlag = true;
            for (let mediaItem of mediaData) {
                if (mediaItem['是否有mv图片'] !== 1) {
                    filterFlag = false;
                } else {
                    delete mediaItem['是否有mv图片'];
                    filterData.push(mediaItem);
                }
            }
            if (filterFlag) {
                mediaData = filterData;
            }

            filterData = [];
            filterFlag = true;
            for (let mediaItem of mediaData) {
                if (mediaItem['是否是空目录'] !== 1) {
                    filterFlag = false;
                } else {
                    delete mediaItem['是否是空目录'];
                    filterData.push(mediaItem);
                }
            }
            if (filterFlag) {
                mediaData = filterData;
            }

            filterData = [];
            filterFlag = true;
            for (let mediaItem of mediaData) {
                if (mediaItem['JSON文件数据是否异常或为空']) {
                    filterFlag = false;
                } else {
                    delete mediaItem['JSON文件数据是否异常或为空'];
                    filterData.push(mediaItem);
                }
            }
            if (filterFlag) {
                mediaData = filterData;
            }

            return mediaData;
        },

        async conversionScanningInfo(fileMediaData) {
            const mappingFun = {
                '是否有json文件': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})下存在多个json文件`);
                        return '有且存在多个文件';
                    }
                    return val === 1 ? '有' : '没有';
                },
                '是否有xml/lrc文件': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})下存在多个xml/lrc文件`);
                        return '有且存在多个文件';
                    }
                    return val === 1 ? '有' : '没有';
                },
                '是否有mp4': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})下存在多个MP4文件`);
                        return '有且存在多个文件';
                    }
                    return val === 1 ? '有' : '没有';
                },
                '是否有m4a_accom': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})下存在多个m4a_accom文件`);
                        return '有且存在多个文件';
                    }
                    return val === 1 ? '有' : '没有';
                },
                '是否有m4a_org': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})下存在多个m4a_org文件`);
                        return '有且存在多个文件';
                    }
                    return val === 1 ? '有' : '没有';
                },
                '是否有图片': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})下存在多张图片`);
                        return '有且存在多张';
                    }
                    return val === 1 ? '有' : '没有';
                },
                '是否有mv图片': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})下存在多张mv图片`);
                        return '有且存在多张';
                    }
                    return val === 1 ? '有' : '没有';
                },
                '是否是空目录': function (val, mediaItem) {
                    return val === 1 ? '不是' : '是';
                },
                'JSON文件数据是否异常或为空': function (val, mediaItem) {
                    let res = '否';
                    if (val === true) {
                        res = '是';
                    } else if (val === false) {
                        res = '否';
                    } else {
                        res = '文件不存在';
                    }
                    return res;
                }
            };
            for (let fileMediaItem of fileMediaData) {
                for (let key in fileMediaItem) {
                    if (!fileMediaItem.hasOwnProperty(key)) continue;
                    if (!mappingFun[key]) continue;
                    fileMediaItem[key] = mappingFun[key](fileMediaItem[key], fileMediaItem);
                }
            }
            return fileMediaData
        },

        matchingNewMp4(fileName, resourceDir) {
            const re = eval("/^(480p|720p|1080p)(?=_" + resourceDir + "\.mp4)/");
            return re.test(fileName);
        },
        matchingNewAccom(fileName) {
            return /^(128)(?=accom)/.test(fileName);
        },
        matchingNewOrg(fileName) {
            return /^(128)(?=org)/.test(fileName);
        },
        matchingMvImg(fileName, resourceDir) {
            const re = eval("/^(mv)(?=_"+ resourceDir +".jpg)/");
            return re.test(fileName);
        },
        mateJson(fileName) {
            return path.extname(fileName) === '.json';
        }
    }
};