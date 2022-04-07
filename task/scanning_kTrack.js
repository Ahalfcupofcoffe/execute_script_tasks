'use strict';

const XLXS = require('xlsx');
const path = require('path');

module.exports = (app, taskInfo) => {
    return {
        taskInfo: {
            ...taskInfo
        },

        async task(app) {
            const readExcelInputDir = this.taskInfo.oldInput;
            const readInputDir = this.taskInfo.input;
            try {
                let oldMediaFileNames = await this.getOldMediaInfo(readExcelInputDir);
                let fileMediaData = await this.mediaFileScanning(readInputDir, oldMediaFileNames);
                let resMediaData = await this.conversionScanningInfo(fileMediaData);
                let sheetNames = [];
                let sheetName = 'shell1';
                sheetNames.push(sheetName);
                let sheets = {};
                if (!sheets[sheetName]) sheets[sheetName] = XLXS.utils.json_to_sheet(resMediaData);
                await app.generateExcel(sheetNames, sheets, this.taskInfo.output);
            } catch (err) {
                app.logger.error(`执行扫描生成媒资信息表失败，错误信息(${err})`);
            }
        },

        async mediaFileScanning(readInputDir, oldMediaFileNames) {
            let fileMediaData = [];
            app.logger.debug(`开始扫描媒资数据，扫描目录：${readInputDir}`);

            try {
                await app.checkExistence(readInputDir);
                const resourceDirs = await app.readDir(readInputDir);
                let totalCount = resourceDirs.length;
                app.logger.debug(`所需完成扫描的总媒资数据：${totalCount}条`);
                for (const resourceDir of resourceDirs) {
                    const fileDir = path.join(readInputDir, resourceDir);
                    if (! await app.checkDir(fileDir)) {
                        app.logger.debug(`扫描目录：${readInputDir}下有文件存在，文件路径：${fileDir}`);
                        continue;
                    }
                    let files = await app.readDir(fileDir);
                    let fileMediaItem = {
                        '目录名': resourceDir,
                        '歌名': '',
                        '所在目录': fileDir
                    };
                    fileMediaItem = Object.assign(fileMediaItem, await this.scanningFile(files, resourceDir, fileDir));
                    fileMediaData.push(fileMediaItem);

                    let jsonFile = files.filter((file) => {
                        return this.mateJson(file)
                    });
                    let jsonFilePath = path.join(fileDir, jsonFile[0]);
                    await app.checkExistence(jsonFilePath);
                    let jsonFileContent = await app.readFile(jsonFilePath, {'encoding': 'utf8'});
                    let jsonContent = JSON.parse(jsonFileContent);
                    fileMediaItem['歌名'] = jsonContent.song_name;
                    fileMediaItem['是否是上一批媒资'] = 0;
                    if (oldMediaFileNames.indexOf(resourceDir) !== -1) {
                        fileMediaItem['是否是上一批媒资']++;
                    }
                }
            } catch (err) {
                app.logger.error(`执行媒资数据扫描失败，扫描目录：${readInputDir}，错误信息：${err}`);
                throw new Error(err);
            }
            return fileMediaData;
        },

        async getOldMediaInfo(readExcelInputDir) {
            let oldMediaFileNames = [];
            app.logger.debug(`开始获取旧媒资信息，获取目录：${readExcelInputDir}`);

            try {
                const oldMediaContents = await app.readExcel(readExcelInputDir);
                for (let oldMediaItem of oldMediaContents) {
                    oldMediaFileNames.push(oldMediaItem['文件名']);
                }
            } catch (err) {
                app.logger.error(`执行获取旧媒资信息失败，获取目录：${readExcelInputDir}，错误信息：${err}`);
                throw new Error(err);
            }
            return oldMediaFileNames;
        },

        async scanningFile(files, resourceDir, fileDir) {
            let fileFormatData = {
                '是否有json文件': 0,
                '是否有xml/lrc文件': 0,
                '是否有旧的mp4': 0,
                '是否有新的mp4': 0,
                '是否有旧的m4a_accom': 0,
                '是否有新的m4a_accom': 0,
                '是否有旧的m4a_org': 0,
                '是否有新的m4a_org': 0,
                '是否有图片': 0,
                '是否有mv图片': 0
            };
            for (let file of files) {
                const fileSuffix = path.extname(file);
                if (fileSuffix === '.json') {
                    fileFormatData['是否有json文件']++;
                } else if (fileSuffix === '.xml' || fileSuffix === '.lrc') {
                    fileFormatData['是否有xml/lrc文件']++;
                } else if (fileSuffix === '.mp4') {
                    const fileName = path.parse(file).name;
                    if (fileName === resourceDir) {
                        fileFormatData['是否有旧的mp4']++;
                    } else if (this.matchingNewMp4(file, resourceDir)) {
                        fileFormatData['是否有新的mp4']++;
                    } else {
                        app.logger.error(`未知格式MP4，打印一下文件名：${file}，所在目录：${fileDir}`);
                    }
                } else if (fileSuffix === '.m4a') {
                    if (this.matchingOldAccom(file)) {
                        fileFormatData['是否有旧的m4a_accom']++;
                    } else if (this.matchingNewAccom(file)) {
                        fileFormatData['是否有新的m4a_accom']++;
                    } else if (this.matchingOldOrg(file)) {
                        fileFormatData['是否有旧的m4a_org']++;
                    } else if (this.matchingNewOrg(file)) {
                        fileFormatData['是否有新的m4a_org']++;
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
                '是否有旧的mp4': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})下存在多个旧的MP4文件`);
                        return '有且存在多个文件';
                    }
                    return val === 1 ? '有' : '没有';
                },
                '是否有新的mp4': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})下存在多个新的MP4文件`);
                        return '有且存在多个文件';
                    }
                    return val === 1 ? '有' : '没有';
                },
                '是否有旧的m4a_accom': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})下存在多个旧的m4a_accom文件`);
                        return '有且存在多个文件';
                    }
                    return val === 1 ? '有' : '没有';
                },
                '是否有新的m4a_accom': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})下存在多个新的m4a_accom文件`);
                        return '有且存在多个文件';
                    }
                    return val === 1 ? '有' : '没有';
                },
                '是否有旧的m4a_org': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})下存在多个旧的m4a_org文件`);
                        return '有且存在多个文件';
                    }
                    return val === 1 ? '有' : '没有';
                },
                '是否有新的m4a_org': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})下存在多个新的m4a_org文件`);
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
                '是否是上一批媒资': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})在旧媒资数据中存在多个`);
                        return '是且存在多个';
                    }
                    return val === 1 ? '是' : '不是';
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
        matchingOldAccom(fileName) {
            return /^(accom)/.test(fileName);
        },
        matchingNewOrg(fileName) {
            return /^(128)(?=org)/.test(fileName);
        },
        matchingOldOrg(fileName) {
            return /^(org)/.test(fileName);
        },
        matchingMvImg(fileName, resourceDir) {
            const re = eval("/^(mv)(?=_"+ resourceDir +"(.jpg|png))/");
            return re.test(fileName);
        },
        mateJson(fileName) {
            return path.extname(fileName) === '.json';
        }
    }
};