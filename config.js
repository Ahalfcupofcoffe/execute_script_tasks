
const moment = require('moment');
const path = require('path');

const ROOT_PATH = path.resolve(__dirname, './');
const IS_DEV_ENV = process.env.NODE_ENV === 'development';
const now = moment().format('YYYYMMDDHHmmss');
const CORE_CONFIG = {
    'LOG': {
        'level': 'log',
        'format': '[{{timestamp}}][{{title}}][{{file}}:{{line}}]{{message}}',
        'dateformat': 'yyyy-mm-dd HH:MM:ss.l',
        'root': 'logs',
        'allLogsFileName': 'gdds',
        'maxLogFiles': 30,
        'transport': function(data) {
            if (IS_DEV_ENV) {
                console.log(data.output);
            }
        }
    },
    'FILE_SAVE_PATH': {
        'csv': path.join(ROOT_PATH, 'csv'),
        'file': path.join(ROOT_PATH, 'file'),
        'excel': path.join(ROOT_PATH, 'excel')
    },
    'TASK': {
        'format': 'YYYY-MM-DD HH:mm:ss',
        'taskInfo': {
            'dirname': path.join(ROOT_PATH, 'task'),
            'filter': /.*\.js$/
        },
        'taskList': {
            // k_song目录扫描任务
            'scanning_kSong': {
                'switch': true,
                'name': 'scanning_kSong',
                'input': path.join(ROOT_PATH, '../', '20241104'),
                'output': path.join(ROOT_PATH, 'xlsx', 'scanning_k_song', `media_track_${now}.xlsx`)
            },
            // 导出多个目录下的媒资数据表
            'output_catalogues_media': {
                'switch': false,
                'name': 'output_catalogues_media',
                'inputs': [
                    path.join(ROOT_PATH, '../', '20241104'),
                ],
                'output': path.join(ROOT_PATH, 'xlsx', 'output_catalogues_media', 'v'),
                'outputName': `media_data_info_${now}`,
                'outputFileSuffix': '.xlsx',
                'errExcelFilePath': path.join(ROOT_PATH, 'xlsx', 'output_catalogues_media', 'fl', `media_err_${now}.xlsx`)
            }
        }
    }
};


module.exports = {
    ...CORE_CONFIG
};
