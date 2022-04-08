
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
            'scanning_kTrack': {
                'switch': false,
                'name': 'scanning_kTrack',
                'input': path.join(ROOT_PATH, '../', 'k_track'),
                'oldInput': path.join(ROOT_PATH, 'xlsx', 'scanning_k_track', 'old', 'media_data.xlsx'),
                'output': path.join(ROOT_PATH, 'xlsx', 'scanning_k_track', `media_track_${now}.xlsx`)
            },
            // k_mv目录扫描任务
            'scanning_kMv': {
                'switch': false,
                'name': 'scanning_kMv',
                'input': path.join(ROOT_PATH, '../', 'k_mv'),
                'output': path.join(ROOT_PATH, 'xlsx', 'scanning_k_mv', `media_mv_${now}.xlsx`)
            },
            // 导出k_track目录下的媒资数据表
            'output_kSong_media': {
                'switch': false,
                'name': 'output_kSong_media',
                'flag': 'song',
                'input': path.join(ROOT_PATH, '../', 'k_song'),
                'output': path.join(ROOT_PATH, 'xlsx', 'media_k_song', 'v', `media_song_${now}.xlsx`),
                'errOutputPrint': true,
                'errExcelFilePath': path.join(ROOT_PATH, 'xlsx', 'media_k_song', 'fl', `media_song_err_${now}.xlsx`)
            },
            // 导出t_mv目录下的媒资数据表
            'output_kMv_media': {
                'switch': false,
                'name': 'output_kMv_media',
                'flag': 'mv',
                'input': path.join(ROOT_PATH, '../', 'k_mv'),
                'output': path.join(ROOT_PATH, 'xlsx', 'media_k_mv', 'v', `media_mv_${now}.xlsx`),
                'errOutputPrint': true,
                'errExcelFilePath': path.join(ROOT_PATH, 'xlsx', 'media_k_mv', 'fl', `media_mv_err_${now}.xlsx`)
            },
            // k_song目录扫描任务
            'scanning_kSong': {
                'switch': false,
                'name': 'scanning_kSong',
                'input': path.join(ROOT_PATH, '../', 'k_song'),
                'oldInput': path.join(ROOT_PATH, 'xlsx', 'scanning_k_song', 'old', 'media_data.xlsx'),
                'output': path.join(ROOT_PATH, 'xlsx', 'scanning_k_song', `media_track_${now}.xlsx`)
            },
            // 合并前后批次的媒资数据表
            'merge_around_media': {
                'switch': false,
                'name': 'merge_around_media',
                'frontInput': path.join(ROOT_PATH, 'xlsx', 'merge_around_media', 'front', 'video.xlsx'),
                'afterInput': path.join(ROOT_PATH, 'xlsx', 'merge_around_media', 'after', 'media_song.xlsx'),
                'output': path.join(ROOT_PATH, 'xlsx', 'merge_around_media', `video.xlsx`)
            },
            // 移动文件
            'cp_file': {
                'switch': false,
                'name': 'cp_file',
                'suffix': '.mp4',
                'input': path.join(ROOT_PATH, '../', 'k_mv'),
                'output': path.join(ROOT_PATH, '../', 'mv_video')
            },
            // 扫描多个目录任务
            'scanning_catalogues': {
                'switch': true,
                'name': 'scanning_catalogues',
                'inputs': [
                    path.join(ROOT_PATH, '../', 'LIVE_2597'),
                    path.join(ROOT_PATH, '../', 'exclusive_6000_1'),
                    path.join(ROOT_PATH, '../', 'exclusive_6000_2'),
                    path.join(ROOT_PATH, '../', 'exclusive_5965'),
                    path.join(ROOT_PATH, '../', 'top_6000_1'),
                    path.join(ROOT_PATH, '../', 'top_6000_2'),
                    path.join(ROOT_PATH, '../', 'top_6000_3'),
                    path.join(ROOT_PATH, '../', 'top_1481')
                ],
                'outputs': path.join(ROOT_PATH, 'xlsx', 'scanning_catalogues')
            }
        }
    }
};


module.exports = {
    ...CORE_CONFIG
};