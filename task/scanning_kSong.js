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
            try {
                let fileMediaData = await this.mediaFileScanning(readInputDir);
                fileMediaData = await this.filterNormalMedia(fileMediaData);
                fileMediaData = await this.filterAttribute(fileMediaData);
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

        async mediaFileScanning(readInputDir) {
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
                        'kmid': resourceDir,
                        'song_name': '',
                        '目录名': fileDir
                    };
                    fileMediaItem = Object.assign(fileMediaItem, await this.scanningFile(files, resourceDir, fileDir));
                    fileMediaData.push(fileMediaItem);

                    if (fileMediaItem['是否有.json文件'] === 0) {
                        fileMediaItem['song_name'] = '未知歌名';
                        app.logger.debug(`找不到对应的json文件，文件名：${resourceDir}.json，文件路径：${fileDir}`);
                        continue;
                    }
                    let jsonFile = files.filter((file) => {
                        return this.mateJson(file)
                    });
                    let jsonFilePath = path.join(fileDir, jsonFile[0]);
                    await app.checkExistence(jsonFilePath);
                    let jsonFileContent = await app.readFile(jsonFilePath, {'encoding': 'utf8'});
                    let jsonContent = JSON.parse(jsonFileContent);
                    fileMediaItem['song_name'] = jsonContent.song_name;
                }
            } catch (err) {
                app.logger.error(`执行媒资数据扫描失败，扫描目录：${readInputDir}，错误信息：${err}`);
                throw new Error(err);
            }
            return fileMediaData;
        },

        async scanningFile(files, resourceDir, fileDir) {
            let fileFormatData = {
                '是否有.json文件': 0,
                '是否有.lrc歌词文件': 0,
                '是否有.mp4视频文件': 0,
                '是否有.jpg海报图': 0,
                '是否有mv开头的.jpg海报图': 0
            };
            for (let file of files) {
                const fileSuffix = path.extname(file);
                if (fileSuffix === '.json') {
                    fileFormatData['是否有.json文件']++;
                } else if (fileSuffix === '.lrc') {
                    fileFormatData['是否有.lrc歌词文件']++;
                } else if (fileSuffix === '.mp4') {
                    if (this.matchingNewMp4(file, resourceDir)) {
                        fileFormatData['是否有.mp4视频文件']++;
                    } else {
                        app.logger.error(`未知格式MP4，打印一下文件名：${file}，所在目录：${fileDir}`)
                    }
                } else if (fileSuffix === '.jpg') {
                    const fileName = path.parse(file).name;
                    if (fileName === resourceDir) {
                        fileFormatData['是否有.jpg海报图']++;
                    } else if (this.matchingMvImg(file, resourceDir)) {
                        fileFormatData['是否有mv开头的.jpg海报图']++;
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
                if (mediaItem['是否有.json文件'] !== 1) {
                    filterFlag = true;
                } else if (mediaItem['是否有.lrc歌词文件'] !== 1) {
                    filterFlag = true;
                } else if (mediaItem['是否有.mp4视频文件'] !== 1) {
                    filterFlag = true;
                } else if (mediaItem['是否有.jpg海报图'] !== 1) {
                    filterFlag = true;
                } else if (mediaItem['是否有mv开头的.jpg海报图'] !== 1) {
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
                if (mediaItem['是否有.json文件'] !== 1) {
                    filterFlag = false;
                } else {
                    delete mediaItem['是否有.json文件'];
                    filterData.push(mediaItem);
                }
            }
            if (filterFlag) {
                mediaData = filterData;
            }

            filterData = [];
            filterFlag = true;
            for (let mediaItem of mediaData) {
                if (mediaItem['是否有.lrc歌词文件'] !== 1) {
                    filterFlag = false;
                } else {
                    delete mediaItem['是否有.lrc歌词文件'];
                    filterData.push(mediaItem);
                }
            }
            if (filterFlag) {
                mediaData = filterData;
            }

            filterData = [];
            filterFlag = true;
            for (let mediaItem of mediaData) {
                if (mediaItem['是否有.mp4视频文件'] !== 1) {
                    filterFlag = false;
                } else {
                    delete mediaItem['是否有.mp4视频文件'];
                    filterData.push(mediaItem);
                }
            }
            if (filterFlag) {
                mediaData = filterData;
            }

            filterData = [];
            filterFlag = true;
            for (let mediaItem of mediaData) {
                if (mediaItem['是否有.jpg海报图'] !== 1) {
                    filterFlag = false;
                } else {
                    delete mediaItem['是否有.jpg海报图'];
                    filterData.push(mediaItem);
                }
            }
            if (filterFlag) {
                mediaData = filterData;
            }

            filterData = [];
            filterFlag = true;
            for (let mediaItem of mediaData) {
                if (mediaItem['是否有mv开头的.jpg海报图'] !== 1) {
                    filterFlag = false;
                } else {
                    delete mediaItem['是否有mv开头的.jpg海报图'];
                    filterData.push(mediaItem);
                }
            }
            if (filterFlag) {
                mediaData = filterData;
            }
            filterData = [];

            return mediaData;
        },

        async conversionScanningInfo(fileMediaData) {
            const mappingFun = {
                '是否有.json文件': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})下存在多个json文件`);
                        return '有且存在多个文件';
                    }
                    return val === 1 ? '有' : '没有';
                },
                '是否有.lrc歌词文件': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})下存在多个xml/lrc文件`);
                        return '有且存在多个文件';
                    }
                    return val === 1 ? '有' : '没有';
                },
                '是否有.mp4视频文件': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})下存在多个MP4文件`);
                        return '有且存在多个文件';
                    }
                    return val === 1 ? '有' : '没有';
                },
                '是否有.jpg海报图': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})下存在多张图片`);
                        return '有且存在多张';
                    }
                    return val === 1 ? '有' : '没有';
                },
                '是否有mv开头的.jpg海报图': function (val, mediaItem) {
                    if (val > 1) {
                        app.logger.error(`扫描目录(${mediaItem['目录名']})下存在多张mv图片`);
                        return '有且存在多张';
                    }
                    return val === 1 ? '有' : '没有';
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
            // 480p_128k_0003brW61bDJ2w
            const re = eval("/^(480p|720p|1080p)_128k(?=_" + resourceDir + "\.mp4)/");
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
