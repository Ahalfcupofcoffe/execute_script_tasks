'use strict';

const XLXS = require('xlsx');
const path = require('path');
const readLine = require('lei-stream').readLine;

module.exports = (app, taskInfo) => {
    return {
        taskInfo: {
            ...taskInfo
        },

        async task(app) {
            let readInputDir = this.taskInfo.input;
            let writeOutputDir = this.taskInfo.output;

            app.logger.debug(`开始读取目录(${readInputDir})文件`);

            let emptyFileInfos = await this.getFileInfo(readInputDir, '目录名');

            let sheetNames = [];
            let sheetName = 'shell1';
            sheetNames.push(sheetName);
            let sheets = {};
            if (!sheets[sheetName]) sheets[sheetName] = XLXS.utils.json_to_sheet(emptyFileInfos);
            await app.generateExcel(sheetNames, sheets, writeOutputDir);
            app.logger.debug(`生成媒资数据空文件表成功`);
        },

        async getFileInfo(readInputDir, checkName) {
            let emptyFileInfos = [];
            let check = {};
            let count = 0;

            await new Promise((resolve, reject) => {
                let readLineStream = readLine(readInputDir, {
                    // 换行符，默认\n
                    newline: '\n',
                    // 是否自动读取下一行，默认false
                    autoNext: true,
                }).on('data', data => {
                    let fileInfo = {};
                    let dir = path.dirname(data);
                    if (check[dir]) {
                        app.logger.error(`重复目录名:${dir}，文件名:${path.basename(data)}`);
                        emptyFileInfos[count - 1]['空文件名'] += ('——' + path.basename(data));
                        return readLineStream.next();
                    }
                    check[dir] = 1;
                    fileInfo['目录名'] = path.join(data.split('/')[1], data.split('/')[2]);
                    fileInfo['空文件名'] = path.basename(data);
                    emptyFileInfos.push(fileInfo);
                    count++;
                }).on('end', () => {
                    readLineStream.close();
                    resolve();
                }).on('error', err => {
                    app.logger.error(`读取目录(${readInputDir})文件失败，错误信息(err:${err})`);
                    readLineStream.close();
                    reject(err);
                });
            });

            return emptyFileInfos;
        }
    };
};