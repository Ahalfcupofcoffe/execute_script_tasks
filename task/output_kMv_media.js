'use strict';

const outputKTrackMedia = require('./output_kSong_media.js');

module.exports = (app, taskInfo) => {
    return {
        taskInfo: {
            ...taskInfo
        },

        async task(app) {
            try {
                const outputKTrackMediaModule = outputKTrackMedia(app, taskInfo);
                await outputKTrackMediaModule.task(app);
            } catch (err) {
                app.logger.error(`导出MV媒资数据表失败，错误信息(${err})`);
            }
        }
    };
};