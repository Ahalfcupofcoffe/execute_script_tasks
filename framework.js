
const fs = require('fs');

const tracer = require('tracer');
const XLXS = require('xlsx');
const controllers = require('require-all');
const { writeLine } = require('lei-stream');


const { TaskHelper } = require('./task.js');


class Framework {
    constructor(config){
        this.config = config;
        this.logger = tracer.dailyfile(this.config.LOG);
        this.taskHelper = new TaskHelper(this);

        this.main();
    }

    // 获取目录模块
    async getModule(options) {
        return new Promise((resolve, reject) => {
            try {
                let modules = controllers(options);
                resolve(modules);
            } catch (err) {
                reject(`获取目录${options.dirname}下的模块失败${err.message}`);
            }
        });
    }

    // 读取目录
    readDir(path, options = {}) {
        return new Promise((resolve, reject) => {
            fs.readdir(path, options, (err, files) => {
                if (err) {
                    this.logger.error(`读取目录：${path}失败，错误信息：${err}`);
                    return reject([]);
                }
                resolve(files);
            })
        });
    }

    // 检查文件或目录
    checkExistence(path) {
        return new Promise((resolve, reject) => {
            fs.access(path, fs.constants.F_OK, (err) => {
                if (err) {
                    this.logger.error(`文件或目录：${path}，${err ? 'does not exist' : 'exists'}`);
                    return reject(err);
                }
                resolve(true);
            })
        });
    }

    // 检查多个文件或目录
    async checkExistences(...paths) {
        try {
            for (const path of paths) {
                await this.checkExistence(path);
            }
        } catch (err) {
            throw new Error(err);
        }
    }

    // 检查文件
    checkFile(path) {
        return new Promise((resolve, reject) => {
           fs.stat(path, (err, stats) => {
               if (err) {
                   this.logger.error(`文件：${path}，err：${err}`);
                   return reject(err);
               }
               if (stats.isFile()) {
                   return resolve(true);
               } else {
                   return resolve(false);
               }
           })
        });
    }

    // 检查目录
    checkDir(path) {
        return new Promise((resolve, reject) => {
            fs.stat(path, (err, stats) => {
                if (err) {
                    this.logger.error(`文件：${path}，err：${err}`);
                    return reject(err);
                }
                if (stats.isDirectory()) {
                    return resolve(true);
                } else {
                    return resolve(false);
                }
            })
        });
    }

    async writeText(path, writeData) {
        const writeLineStream = writeLine(path, {
            // 换行符，默认\n
            newline: '\n',
            // 缓存的行数，默认为0（表示不缓存），此选项主要用于优化写文件性能，写入的内容会先存储到缓存中，当内容超过指定数量时再一次性写入到流中，可以提高写速度
            cacheLines: 0
        });

        for (let writeItem of writeData) {
            writeLineStream.write(JSON.stringify(writeItem) + ',', () => {
                // 回调函数可选
                console.log('wrote');
            });
        }

        writeLineStream.end(() => {
            // 回调函数可选
            console.log('end');
        });

        writeLineStream.on('error', (err) => {
            console.error(err);
        });
    }

    /**
     * 导出所有模块
     * @param filePath 文件路径
     * @param option 选项 {
     *      recurse(Boolean)：是否递归，默认false
     *      filter(Function/)：过滤器
     * }
     * @returns {Promise<void>}
     */
    async exportAllModule(filePath, option) {

    }

    async readExcel(path) {
        return new Promise((resolve, reject) => {
            try {
                let workbook = XLXS.readFile(path);
                let sheetNames = workbook.SheetNames; //获取表明
                let data = [];
                for (let sheetName of sheetNames) {
                    let sheet = workbook.Sheets[sheetName]; //通过表明得到表对象
                    data = XLXS.utils.sheet_to_json(sheet); // 通过工具将表对象的数据读出来并转成json
                }
                resolve(data);
            } catch (err) {
                this.logger.error(`读取excel失败：${err.message}`);
                reject(err);
            }
        });
    }

    readFile(path, options = {}) {
        return new Promise((resolve, reject) => {
            fs.readFile(path, options, (err, data) => {
                if (err) {
                    this.logger.error(`读取文件：${path}失败，错误信息：${err}`);
                    return reject('');
                }
                resolve(data);
            });
        });
    }

    async generateExcel(months, sheets, filePath) {
        // 定义操作文档
        let workbook = {
            SheetNames: months, //定义表明
            Sheets: sheets
        };

        XLXS.writeFile(workbook, filePath); //将数据写入文件
    }

    async mvFile(oldPath, newPath) {
        return new Promise((resolve, reject) => {
            fs.rename(oldPath, newPath, (err) => {
                if (err) return reject(err);
                this.logger.debug('Rename complete!');
                resolve();
            });
        });
    }

    async cpFile(src, dest, mode) {
        return new Promise((resolve, reject) => {
           fs.copyFile(src, dest, (err => {
               if (err) return reject(err);
               this.logger.debug(`文件：${src} copy complete!`);
               resolve();
           }));
        });
    }

    isArray(arg) {
        if (!Array.isArray) {
            return Object.prototype.toString.call(arg) === '[object Array]';
        }
        return Array.isArray(arg);
    }

    main() {
        this.logger.log(`启动主函数`);
        this.taskHelper.taskRun().then(() => {
            this.logger.log(`启动任务运行成功`);
        }).catch(err => {
            this.logger.error(`启动任务运行失败${err}`);
        });
    }
}



module.exports = Framework;