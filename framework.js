
const fs = require('fs');
const path = require('path');

const tracer = require('tracer');
const XLSX = require('xlsx');
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

    /**
     * 同步读取目录
     * @param route {String} 读取路径
     * @param options {Object | String} 选项
     * @returns {string[]} 读取结果
     */
    readDirSync(route, options = {}) {
        return fs.readdirSync(route);
    }

    /**
     * 读取目录详情（目录名 --> 包含路径的目录名）
     * @param route {String} 读取路径
     * @param options {Object | String} 选项
     * @returns {string[]} 读取结果
     */
    readDirInfoSync(route, options = {}) {
        let dirContents = this.readDirSync(route, options);
        dirContents = dirContents.map((cur) => {
            return path.join(route, cur);
        });
        return dirContents;
    }

    /**
     * 读取多个目录详情（目录名 --> 包含路径的目录名）
     * @param routes {Array} 读取路径
     * @param options {Object | String} 选项
     * @returns {[]}
     */
    readDirsInfoSync(routes, options = {}) {
        let dirContents = [];
        for (let route of routes) {
            dirContents = dirContents.concat(this.readDirInfoSync(route, options));
        }
        return dirContents;
    }

    /**
     * 读取目录
     * @param route {String} 读取路径
     * @param options {Object | String} 选项
     * @returns {Promise<[]>} 读取结果
     */
    readDir(route, options = {}) {
        return new Promise((resolve, reject) => {
            fs.readdir(route, options, (err, files) => {
                if (err) {
                    this.logger.error(`读取目录：${route}失败，错误信息：${err}`);
                    return reject(err);
                }
                resolve(files);
            })
        });
    }

    /**
     * 读取目录详情（目录名 --> 包含路径的目录名）
     * @param route {String} 读取路径
     * @param options {Object | String} 选项
     * @returns {Promise<[]>} 读取结果
     */
    async readDirInfo(route, options = {}) {
        let dirContents = await this.readDir(route, options);
        dirContents = dirContents.map((cur) => {
            return path.join(route, cur);
        });
        return dirContents;
    }

    /**
     * 读取多个目录详情（目录名 --> 包含路径的目录名）
     * @param routes {Array} 读取路径
     * @param options {Object | String} 选项
     * @returns {Promise<[]>} 读取结果
     */
    async readDirsInfo(routes, options = {}) {
        let dirContents = [];
        for (let route of routes) {
            dirContents = dirContents.concat(await this.readDirInfo(route, options));
        }
        return dirContents;
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
                if (Array.isArray(path)) {
                    return await this.checkExistences(...path);
                }

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

    // 异步检查目录
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

    // 同步检查路径
    checkPathSync(path) {
        return fs.existsSync(path);
    }

    // 写入
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

    /**
     * 读取excel
     * @param path {String} 路径
     * @returns {Promise<[]>} 读取结果
     */
    async readExcel(path) {
        return new Promise((resolve, reject) => {
            try {
                let workbook = XLSX.readFile(path);
                let sheetNames = workbook.SheetNames; //获取表明
                let data = [];
                for (let sheetName of sheetNames) {
                    let sheet = workbook.Sheets[sheetName]; //通过表明得到表对象
                    data = XLSX.utils.sheet_to_json(sheet); // 通过工具将表对象的数据读出来并转成json
                }
                resolve(data);
            } catch (err) {
                this.logger.error(`读取excel失败：${err.message}`);
                reject(err);
            }
        });
    }

    async readExcelWorkBook(path) {
        return new Promise((resolve, reject) => {
            try {
                let workbook = XLSX.readFile(path);
                resolve(workbook);
            } catch (err) {
                this.logger.error(`读取excel失败：${err.message}`);
                reject(err);
            }
        });
    }

    /**
     * 读取多个excel
     * @param paths {Array} 路径
     * @returns {Promise<[]>} 读取结果
     */
    async readExcels(paths) {
        let data = [];
        for (let path of paths) {
            data = data.concat(await this.readExcel(path));
        }
        return data;
    }

    // 异步读取文件
    readFile(path, options = {}) {
        return new Promise((resolve, reject) => {
            fs.readFile(path, options, (err, data) => {
                if (err) {
                    this.logger.error(`读取文件：${path}失败，错误信息：${err}`);
                    return reject(err);
                }
                resolve(data);
            });
        });
    }

    // 生成excel
    async generateExcel(months, sheets, filePath) {
        // 定义操作文档
        let workbook = {
            SheetNames: months, //定义表明
            Sheets: sheets
        };

        XLSX.writeFile(workbook, filePath); //将数据写入文件
    }

    async fixedGenerateExcel(data, filePath) {
        try {
            let sheets = {};
            let sheetNames = [];
            let sheetName = 'shell1';
            let jsonData = XLSX.utils.json_to_sheet(data); //通过工具将json转表对象
            sheetNames.push(sheetName);
            if (!sheets[sheetName]) sheets[sheetName] = Object.assign({}, jsonData);
            await this.generateExcel(sheetNames, sheets, filePath);
        } catch (err) {
            this.logger.error(`生成excel文件失败，err:${err}`);
            throw err;
        }
    }

    // 移动文件
    async mvFile(oldPath, newPath) {
        return new Promise((resolve, reject) => {
            fs.rename(oldPath, newPath, (err) => {
                if (err) return reject(err);
                this.logger.debug('Rename complete!');
                resolve();
            });
        });
    }

    // 复制文件
    async cpFile(src, dest, mode) {
        return new Promise((resolve, reject) => {
           fs.copyFile(src, dest, (err => {
               if (err) return reject(err);
               this.logger.debug(`文件：${src} copy to ${dest} complete!`);
               resolve();
           }));
        });
    }

    /**
     * 删除文件夹（递归删除）
     * @param folderPath {String} 文件夹路径
     * @returns {Promise<void>}
     */
    async deleteFolder(folderPath) {
        if (fs.existsSync(folderPath)) {
            fs.readdirSync(folderPath).forEach( (file)=> {
                const filePath = path.join(folderPath, file);
                if (fs.statSync(filePath).isDirectory()) { // recurse
                    this.deleteFolder(filePath);
                } else { // delete file
                    fs.unlinkSync(filePath);
                }
            });
            fs.rmdirSync(folderPath);
        }
    }

    async deleteFile(filePath) {
        return new Promise((resolve, reject) => {
            fs.unlink(filePath, (err) => {
               if (err) {
                   this.logger.error(`删除文件：${filePath}失败，错误信息(err:${err})`);
                   return reject(err);
               }
               resolve(true);
            });
        });
    }

    deleteFileSync(filePath) {
        fs.unlinkSync(filePath);
    }

    // 数组判断
    isArray(arg) {
        if (!Array.isArray) {
            return Object.prototype.toString.call(arg) === '[object Array]';
        }
        return Array.isArray(arg);
    }

    // 异步创建目录
    async createDir(path, mode = 0o777) {
        return new Promise((resolve, reject) => {
            if (this.checkPathSync(path)) return resolve();
            fs.mkdir(path, mode, (err) => {
                if (err) {
                    this.logger.error(`创建目录：${path}失败，错误信息(err:${err})`);
                    return reject(err);
                }
                resolve();
            })
        });
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