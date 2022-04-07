const moment = require('moment');

class Task {
    constructor(app) {
        this.app = app;
    }

    async task() {}
}

class TaskHelper {
    constructor(app) {
        this.taskList = [];
        this.app = app;
    }

    async getTask() {
        let task = this.app.config.TASK;
        let modules = {};
        try {
            modules = await this.app.getModule(task.taskInfo);
        } catch (err) {
            this.app.logger.error(`[task]初始化失败，找不到配置文件 ${err.message}`);
        }
        for (let key in modules) {
            if (!modules.hasOwnProperty(key)) continue;
            let moduleName = key.split('.js')[0];
            let taskInfo = task.taskList[moduleName];
            this.taskList.push(modules[key](this.app, taskInfo || {}));
        }
    }

    async taskRun() {
        try {
            await this.getTask();
        } catch (err) {
            this.app.logger.error(`执行获取任务队列失败${err.message}`);
        }
        const format = this.app.config.TASK.format;
        for (let task of this.taskList) {
            const taskInfo = task.taskInfo;
            if (!taskInfo.switch) {
                this.app.logger.log(`任务${taskInfo.name}启动失败，未打开启动开关，跳过该任务`);
                continue;
            }
            try {
                this.app.logger.log(`开始执行任务: ${taskInfo.name}，执行任务时间: ${moment().format(format)}`);
                await task.task(this.app);
            } catch (err) {
                this.app.logger.error(`执行任务: ${taskInfo.name} 失败${err}，执行任务时间: ${moment().format(format)}`);
            }
        }
    }
}

module.exports = {
    Task,
    TaskHelper
};