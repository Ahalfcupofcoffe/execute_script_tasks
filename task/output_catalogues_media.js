'use strict';

const XLXS = require('xlsx');
const path = require('path');

class MediaData {
    constructor() {
        this.data = [];
        this.num = 0;
    }
}

class ErrMediaData {
    constructor() {
        this.data = [];
        this.num = 0;
    }
}

module.exports = (app, taskInfo) => {
    return {
        taskInfo: {
            ...taskInfo
        },

        mediaData: null,
        errMediaData: null,
        fbGenerator: null,

        roundNum: 0,
        mediaNum: 0,

        async task(app) {
            try {
                let readInputDirs = this.taskInfo.inputs;
                if (!readInputDirs) {
                    app.logger.error(`执行导出媒资数据表失败，没有指定媒资数据目录`);
                    return;
                }
                if (!app.isArray(readInputDirs)) readInputDirs = [readInputDirs];
                // 初始化执行任务所需的类
                if (!this.mediaData) this.mediaData = new MediaData();
                if (!this.errMediaData) this.errMediaData = new ErrMediaData();
                // 获取所有需要读取媒资数据的目录
                let roundLength = readInputDirs.length;
                app.logger.debug(`开始按目录读取媒资数据，共${roundLength}个目录`);
                // 任务生成器，把每一个目录当前一个任务
                if (!this.fbGenerator) this.fbGenerator = this.FbGenerator(readInputDirs);
                // 开始执行任务
                await this.nextRound(this.readMediaDir);
            } catch (err) {
                app.logger.error(`执行导出媒资数据表失败，错误信息(${err.stack})`);
            }

        },

        /**
         * 生成器
         */
        * FbGenerator(list) {
            for (let i = 0; i < list.length; i++) {
                yield list[i];
            }
        },

        async readMediaDir(dir, that) {
            try {
                app.logger.debug(`开始第${that.roundNum}轮读取媒资数据，所在目录：${dir}`);
                const mediaResourceNames = await app.readDir(dir);
                const mediaResourceLength = mediaResourceNames.length;
                app.logger.debug(`所需读取的总媒资数据：${mediaResourceLength}条`);
                let readMediaNum = 0;
                for (let mediaResourceName of mediaResourceNames) {
                    const mediaResourceDir = path.join(dir, mediaResourceName);
                    await app.checkExistence(mediaResourceDir);
                    if (!await app.checkDir(mediaResourceDir)) {
                        app.logger.debug(`扫描目录：${mediaResourceDir}下有文件存在，非目录跳过，文件路径：${mediaResourceDir}`);
                        continue;
                    }
                    let mediaFileNames = await app.readDir(mediaResourceDir);
                    let jsonFile = mediaFileNames.filter((fileName) => {
                        return that.mateJson(fileName)
                    });
                    if (jsonFile.length !== 1) {
                        // 多份或者没有JSON文件的，先跳过遍历，然后记录下来
                        that.errMediaData.data.push({'所在目录': mediaResourceDir, '错误提示': '没有或多于一个JSON文件'});
                        that.mediaNum++;
                        that.errMediaData.num++;
                        readMediaNum++;
                        app.logger.debug(`当前是第${that.roundNum}轮读取媒资数据，完成读取进度：${that.progressCalculation(readMediaNum, mediaResourceLength)}%`);
                        continue;
                    }
                    let jsonFileDir = path.join(mediaResourceDir, jsonFile.join(''));
                    await app.checkFile(jsonFileDir);
                    let jsonContent = await app.readFile(jsonFileDir, {'encoding': 'utf8'});
                    let content = JSON.parse(jsonContent);
                    let sortMediaItem = {};
                    let mediaItem = await that.converterJsonData(content);
                    if (Object.prototype.toString.call(mediaItem) !== '[object Object]' || !sortMediaItem) {
                        // 出现不可预期的JSON数据，先跳过遍历，然后记录下来
                        that.errMediaData.data.push({'所在目录': mediaResourceDir, '错误提示': '出现不可预期的JSON数据字段', '字段名': mediaItem});
                        that.mediaNum++;
                        that.errMediaData.num++;
                        readMediaNum++;
                        app.logger.debug(`当前是第${that.roundNum}轮读取媒资数据，完成读取进度：${that.progressCalculation(readMediaNum, mediaResourceLength)}%`);
                        continue;
                    }
                    // 新增字段
                    sortMediaItem['所在目录'] = mediaResourceDir;
                    mediaItem = Object.assign(sortMediaItem, mediaItem);
                    mediaItem['读取文件目录地址'] = jsonFileDir;
                    that.mediaData.data.push(mediaItem);
                    that.mediaNum++;
                    that.mediaData.num++;
                    readMediaNum++;
                    app.logger.debug(`当前是第${that.roundNum}轮读取媒资数据，完成读取进度：${that.progressCalculation(readMediaNum, mediaResourceLength)}%`);
                    // 判断是否要分表生成
                    if (!that.taskInfo.outputMediaSize) {
                        app.logger.debug(`当前是第${that.roundNum}轮读取媒资数据，没有配置分表生成媒资数据表，会统一生成，本轮生成跳过`);
                        continue;
                    }
                    // 配置了分表生成，但不满足数据表存储媒资量，读取下一条媒资
                    if (that.mediaData.data.length <= that.taskInfo.outputMediaSize) {
                        app.logger.info(`当前是第${that.roundNum}轮读取媒资数据，媒资数据不足，无法生成媒资数据表，跳过本次媒资表生成，进入下条媒资读取`);
                        continue;
                    }
                    // 配置了分表生成，且满足数据表存储媒资量，开始生成媒资数据
                    app.logger.debug(`当前是第${that.roundNum}轮读取媒资数据，媒资数据满足，准备生成媒资数据表`);
                    that.taskInfo.outputFileSerialNum++;
                    const mediaDataFileDir = path.join(that.taskInfo.output, `${that.taskInfo.outputName}_${that.taskInfo.outputFileSerialNum}${that.taskInfo.outputFileSuffix}`);
                    await that.generateMediaDataTable(that.taskInfo.outputMediaSize, mediaDataFileDir, {'retry': 3});
                }
                // 判断是否是最后一轮
                if (that.taskInfo.inputs.length === that.roundNum) {
                    // 判断是否要分表生成
                    if (!that.taskInfo.outputMediaSize) {
                        // 是最后一轮且没有配置分表生成
                        app.logger.debug(`最后一轮读取媒资数据完成且没有配置分表生成媒资数据，准备所有数据统一生成`);
                        that.taskInfo.outputFileSerialNum++;
                        const mediaDataFileDir = path.join(that.taskInfo.output, `${that.taskInfo.outputName}_${that.taskInfo.outputFileSerialNum}${that.taskInfo.outputFileSuffix}`);
                        await that.generateMediaDataTable(that.taskInfo.outputMediaSize, mediaDataFileDir, {'retry': 3});
                        return;
                    }
                    // 需要分表生成
                    // 判断是否还有剩余数据
                    if (that.mediaData.data.length === 0) {
                        app.logger.debug(`最后一轮读取媒资数据完成，未有剩余媒资数据，剩余媒资数据为：${that.mediaData.data.length}条`);
                        return;
                    }
                    // 最后一轮了，如果还有数据剩余，那就直接生成媒资数据表
                    app.logger.debug(`最后一轮读取媒资数据完成，准备将剩余数据生成媒资数据表`);
                    that.taskInfo.outputFileSerialNum++;
                    const mediaDataFileDir = path.join(that.taskInfo.output, `${that.taskInfo.outputName}_${that.taskInfo.outputFileSerialNum}${that.taskInfo.outputFileSuffix}`);
                    await that.generateMediaDataTable(that.taskInfo.outputMediaSize, mediaDataFileDir, {'retry': 3});
                    return;
                }
                // 如果不是最后一轮，那就跳到下一轮
                await that.nextRound(that.readMediaDir);
            } catch (err) {
                app.logger.error(`读取媒资数据出错，所在目录：${dir}，错误信息：${err.stack}`);
            }
        },

        converterJsonData(content) {
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

        progressCalculation(curProgress, totalProgress) {
            return parseInt((curProgress / totalProgress) * 100);
        },

        async generateMediaDataTable(mediaNum, tableDir, options = {}) {
            try {
                let sheets = {};
                let sheetNames = [];
                let sheetName = 'shell1';
                let generateMediaData = this.mediaData.data.slice(0, mediaNum);
                let mediaDataJson = XLXS.utils.json_to_sheet(generateMediaData); //通过工具将json转表对象
                sheetNames.push(sheetName);
                if (!sheets[sheetName]) sheets[sheetName] = Object.assign({}, mediaDataJson);
                await app.generateExcel(sheetNames, sheets, tableDir);
                app.logger.debug(`生成媒资数据表成功，表名：${path.basename(tableDir)}`);
            } catch (err) {
                app.logger.error(`生成媒资数据表失败`);
                if (!options.retry) return;
                app.logger.error(`检测到有配置生成重试项，准备重试！`);
                --options.retry;
                await this.generateMediaDataTable(mediaNum, tableDir, options);
                return;
            }
            // 如果生成成功就把生成的媒资数据在存储变量里删除
            this.mediaData.data.splice(0, mediaNum);
        },

        async generateErrMediaDataTable(errMediaData, tableDir, options = {}) {
            try {
                let sheets = {};
                let sheetNames = [];
                let sheetName = 'shell1';
                let errMediaDataJson = XLXS.utils.json_to_sheet(errMediaData); //通过工具将json转表对象
                sheetNames.push(sheetName);
                if (!sheets[sheetName]) sheets[sheetName] = Object.assign({}, errMediaDataJson);
                await app.generateExcel(sheetNames, sheets, tableDir);
                app.logger.debug(`生成错误媒资数据表成功，表名：${path.basename(tableDir)}`);
            } catch (err) {
                app.logger.error(`生成错误媒资数据表失败`);
                if (!options.retry) return;
                app.logger.error(`检测到有配置生成重试项，准备重试！`);
                --options.retry;
                await this.generateErrMediaDataTable(errMediaData, tableDir, options);
            }
        },

        /**
         * 继续下一轮任务
         *
         * @param {Function} worker 执行下一轮任务函数
         */
        async nextRound(worker) {
            try {
                // 获取下一个参数
                const data = this.fbGenerator.next();
                // 判断是否已经完成，如果完成则调用完成函数，执行结束程序
                if (data.done) {
                    await this.done();
                    return;
                }
                this.roundNum++;
                // 否则继续任务
                await worker(data.value, this);
            } catch (err) {
                app.logger.error(`获取下一轮任务失败(err：${err})`);
            }
        },

        /**
         * 完成，当所有任务完成时调用该函数以结束程序
         */
        async done() {
            app.logger.debug(`完成所有媒资数据目录读取，共读取媒资数据：${this.mediaNum}条，其中错误媒资数据共：${this.errMediaData.num}条`);
            // 判断是否有错误媒资数据
            if (this.errMediaData.data.length === 0) return;
            // 有错误媒资数据，准备生成错误媒资数据表
            app.logger.debug(`准备生成错误媒资数据表`);
            await this.generateErrMediaDataTable(this.errMediaData.data, this.taskInfo.errExcelFilePath, {'retry': 3});

            app.logger.debug(`任务完成`);
        },

        mateJson(filePath) {
            return filePath.indexOf('.json') !== -1;
        }
    };
};