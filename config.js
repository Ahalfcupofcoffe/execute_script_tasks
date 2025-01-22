
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
            // // k_song目录扫描任务
            // 'scanning_kTrack': {
            //     'switch': false,
            //     'name': 'scanning_kTrack',
            //     'input': path.join(ROOT_PATH, '../', 'k_track'),
            //     'oldInput': path.join(ROOT_PATH, 'xlsx', 'scanning_k_track', 'old', 'media_data.xlsx'),
            //     'output': path.join(ROOT_PATH, 'xlsx', 'scanning_k_track', `media_track_${now}.xlsx`)
            // },
            // // k_mv目录扫描任务
            // 'scanning_kMv': {
            //     'switch': false,
            //     'name': 'scanning_kMv',
            //     'input': path.join(ROOT_PATH, '../', 'k_mv'),
            //     'output': path.join(ROOT_PATH, 'xlsx', 'scanning_k_mv', `media_mv_${now}.xlsx`)
            // },
            // // 导出k_track目录下的媒资数据表
            // 'output_kSong_media': {
            //     'switch': false,
            //     'name': 'output_kSong_media',
            //     'flag': 'song',
            //     'input': path.join(ROOT_PATH, '../', '20241104'),
            //     'output': path.join(ROOT_PATH, 'xlsx', 'media_k_song', 'v', `media_song_${now}.xlsx`),
            //     'errOutputPrint': true,
            //     'errExcelFilePath': path.join(ROOT_PATH, 'xlsx', 'media_k_song', 'fl', `media_song_err_${now}.xlsx`)
            // },
            // // 导出t_mv目录下的媒资数据表
            // 'output_kMv_media': {
            //     'switch': false,
            //     'name': 'output_kMv_media',
            //     'flag': 'mv',
            //     'input': path.join(ROOT_PATH, '../', 'k_mv'),
            //     'output': path.join(ROOT_PATH, 'xlsx', 'media_k_mv', 'v', `media_mv_${now}.xlsx`),
            //     'errOutputPrint': true,
            //     'errExcelFilePath': path.join(ROOT_PATH, 'xlsx', 'media_k_mv', 'fl', `media_mv_err_${now}.xlsx`)
            // },
            // k_song目录扫描任务
            'scanning_kSong': {
                'switch': true,
                'name': 'scanning_kSong',
                'input': path.join(ROOT_PATH, '../', '20241104'),
                'output': path.join(ROOT_PATH, 'xlsx', 'scanning_k_song', `media_track_${now}.xlsx`)
            },
            // // 合并前后批次的媒资数据表
            // 'merge_around_media': {
            //     'switch': false,
            //     'name': 'merge_around_media',
            //     'frontInput': path.join(ROOT_PATH, 'xlsx', 'merge_around_media', 'front', 'video.xlsx'),
            //     'afterInput': path.join(ROOT_PATH, 'xlsx', 'merge_around_media', 'after', 'media_song.xlsx'),
            //     'output': path.join(ROOT_PATH, 'xlsx', 'merge_around_media', `video.xlsx`)
            // },
            // // 移动文件
            // 'mv_file': {
            //     'switch': false,
            //     'name': 'mv_file',
            //     'suffix': '.mp4',
            //     'input': path.join(ROOT_PATH, '../', 'k_mv'),
            //     'output': path.join(ROOT_PATH, '../', 'mv_video')
            // },
            // // 扫描多个目录任务
            // 'scanning_catalogues': {
            //     'switch': false,
            //     'name': 'scanning_catalogues',
            //     'inputs': [
            //         path.join(ROOT_PATH, '../', 'LIVE_2597'),
            //         path.join(ROOT_PATH, '../', 'exclusive_6000_1'),
            //         path.join(ROOT_PATH, '../', 'exclusive_6000_2'),
            //         path.join(ROOT_PATH, '../', 'exclusive_5965'),
            //         path.join(ROOT_PATH, '../', 'top_6000_1'),
            //         path.join(ROOT_PATH, '../', 'top_6000_2'),
            //         path.join(ROOT_PATH, '../', 'top_6000_3'),
            //         path.join(ROOT_PATH, '../', 'top_1481'),
            //         path.join(ROOT_PATH, '../', 'exclusive_7162_20220411'),
            //         path.join(ROOT_PATH, '../', 'top_1590_20220411'),
            //     ],
            //     'outputs': path.join(ROOT_PATH, 'xlsx', 'scanning_catalogues')
            // },
            // // 扫描缺失
            // 'scanning_defect': {
            //     'switch': false,
            //     'name': 'scanning_defect',
            //     'scans': [
            //         path.join(ROOT_PATH, '../', 'exclusive_7162_20220411'),
            //         path.join(ROOT_PATH, '../', 'top_1590_20220411')
            //     ],
            //     'input': path.join(ROOT_PATH, 'xlsx', 'scanning_defect', 'total', 'media_defect.xlsx'),
            //     'output': path.join(ROOT_PATH, 'xlsx', 'scanning_defect', 'defect', `media_defect_${now}.xlsx`)
            // },
            // // txt文件转excel
            // 'txt_turn_excel': {
            //     'switch': false,
            //     'name': 'txt_turn_excel',
            //     'input': path.join(ROOT_PATH, 'txt', 'txt_turn_excel', 'nohup.txt'),
            //     'output': path.join(ROOT_PATH, 'xlsx', 'txt_turn_excel', `empty_file_list_${now}.xlsx`)
            // },
            // // 媒资对比
            // 'media_contrast': {
            //     'switch': false,
            //     'name': 'media_contrast',
            //     'inputs': [
            //         path.join(ROOT_PATH, '../', 'exclusive_6000_2')
            //     ],
            //     'contrast_dirs': [
            //         path.join(ROOT_PATH, 'xlsx', 'media_contrast', 'inp', 'media_exclusive_6000_2.xlsx')
            //     ],
            //     'output': path.join(ROOT_PATH, 'xlsx', 'media_contrast', 'out', `media_contrast_res_${now}.xlsx`)
            // },
            // // 异常媒资删除
            // 'abnormal_media_del': {
            //     'switch': false,
            //     'name': 'abnormal_media_del',
            //     'inputs': [
            //         path.join(ROOT_PATH, '../', 'exclusive_6000_2')
            //     ],
            //     'delete_dirs': [
            //         path.join(ROOT_PATH, 'xlsx', 'abnormal_media_del', 'inp', 'media_exclusive_6000_2.xlsx')
            //     ],
            //     'output': path.join(ROOT_PATH, 'xlsx', 'abnormal_media_del', 'out', `media_del_omission_${now}.xlsx`)
            // },
            // // 媒资数据表转化为合并视频音频媒资数据表
            // 'conversion_merge': {
            //     'switch': false,
            //     'name': 'conversion_merge',
            //     'input': `${path.join(ROOT_PATH, 'xlsx', 'conversion_merge', 'inp')}`,
            //     'output': `${path.join(ROOT_PATH, 'xlsx', 'conversion_merge', 'out')}`
            // },
            // // 伴奏处理
            // 'accompaniment_handle': {
            //     'switch': false,
            //     'name': 'accompaniment_handle',
            //     'filterCatalogues': [ // 过滤目录
            //         path.join(ROOT_PATH, '../', 'LIVE_2597'),
            //         path.join(ROOT_PATH, '../', 'exclusive_6000_1'),
            //         path.join(ROOT_PATH, '../', 'exclusive_6000_2'),
            //         path.join(ROOT_PATH, '../', 'exclusive_5965'),
            //         path.join(ROOT_PATH, '../', 'top_6000_1'),
            //         path.join(ROOT_PATH, '../', 'top_6000_2'),
            //         path.join(ROOT_PATH, '../', 'top_6000_3'),
            //         path.join(ROOT_PATH, '../', 'top_1481'),
            //         path.join(ROOT_PATH, '../', 'exclusive_7162_20220411'),
            //         path.join(ROOT_PATH, '../', 'top_1590_20220411'),
            //         path.join(ROOT_PATH, '../', 'k_song')
            //     ],
            //     'mergeSourcesCatalogues': [ // 合并源目录
            //         path.join(ROOT_PATH, '../', 'LIVE_2597'),
            //         path.join(ROOT_PATH, '../', 'exclusive_6000_1'),
            //         path.join(ROOT_PATH, '../', 'exclusive_6000_2'),
            //         path.join(ROOT_PATH, '../', 'exclusive_5965'),
            //         path.join(ROOT_PATH, '../', 'top_6000_1'),
            //         path.join(ROOT_PATH, '../', 'top_6000_2'),
            //         path.join(ROOT_PATH, '../', 'top_6000_3'),
            //         path.join(ROOT_PATH, '../', 'top_1481'),
            //         path.join(ROOT_PATH, '../', 'k_song')
            //     ],
            //     'mergeTargetCatalogues': [ // 合并目标目录
            //         path.join(ROOT_PATH, '../', 'exclusive_7162_20220411'),
            //         path.join(ROOT_PATH, '../', 'top_1590_20220411')
            //     ],
            //     'inputs': [
            //         path.join(ROOT_PATH, '../', 'LIVE_2597'),
            //         path.join(ROOT_PATH, '../', 'exclusive_6000_1'),
            //         path.join(ROOT_PATH, '../', 'exclusive_6000_2'),
            //         path.join(ROOT_PATH, '../', 'exclusive_5965'),
            //         path.join(ROOT_PATH, '../', 'top_6000_1'),
            //         path.join(ROOT_PATH, '../', 'top_6000_2'),
            //         path.join(ROOT_PATH, '../', 'top_6000_3'),
            //         path.join(ROOT_PATH, '../', 'top_1481'),
            //         path.join(ROOT_PATH, '../', 'k_song')
            //     ],
            //     'outputs': path.join(ROOT_PATH, 'xlsx', 'scanning_catalogues')
            // },
            // // 过滤旧的媒资
            // 'filter_old_media': {
            //     'switch': false,
            //     'name': 'filter_old_media',
            //     'input': path.join(ROOT_PATH, '../', 'new_merge'),
            //     'output': path.join(ROOT_PATH, 'xlsx', 'filter_old_media')
            // },
            // // 合并媒资归类
            // 'merge_media_classification': {
            //     'switch': false,
            //     'name': 'merge_media_classification',
            //     'inputs': [
            //         path.join(ROOT_PATH, '../', 'LIVE_2597'),
            //         path.join(ROOT_PATH, '../', 'exclusive_6000_1'),
            //         path.join(ROOT_PATH, '../', 'exclusive_6000_2'),
            //         path.join(ROOT_PATH, '../', 'exclusive_5965'),
            //         path.join(ROOT_PATH, '../', 'top_6000_1'),
            //         path.join(ROOT_PATH, '../', 'top_6000_2'),
            //         path.join(ROOT_PATH, '../', 'top_6000_3'),
            //         path.join(ROOT_PATH, '../', 'top_1481'),
            //         path.join(ROOT_PATH, '../', 'k_song')
            //     ],
            //     'output': path.join(ROOT_PATH, '../', 'new_merge'),
            //     'errDir': path.join(ROOT_PATH, 'xlsx', 'merge_media_classification')
            // },
            // 'cover_media': {
            //     'switch': false,
            //     'name': 'cover_media',
            //     'oldInputFile': path.join(ROOT_PATH, 'xlsx', 'check_media', 'media_classification_check_20230111.xlsx'),
            //     'inputFile': path.join(ROOT_PATH, 'xlsx', 'cover_media', 'media_cover_res_20230111.xlsx'),
            //     'outputFile': path.join(ROOT_PATH, 'xlsx', 'cover_media', 'media_cover_res_20230111.xlsx')
            // },
            // 'merge_media_info': {
            //     'switch': false,
            //     'name': 'merge_media_info',
            //     'sourceFileDir': path.join(ROOT_PATH, 'xlsx', 'merge_media_info', `media_data_info.xlsx`),
            //     'targetFileDir': path.join(ROOT_PATH, 'xlsx', 'merge_media_info', `media_data_info_success.xlsx`),
            //     'mergeFileDir': path.join(ROOT_PATH, 'xlsx', 'merge_media_info', `media_data_info_${now}.xlsx`)
            // }
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
                'errOutputPrint': true,
                'errExcelFilePath': path.join(ROOT_PATH, 'xlsx', 'output_catalogues_media', 'fl', `media_err_${now}.xlsx`)
            },
            // // 检查媒资
            // 'check_media': {
            //     'switch': true,
            //     'name': 'check_media',
            //     'inputs': [
            //         path.join(ROOT_PATH, '../', '20241104'),
            //     ],
            //     'oldInputFile': path.join(ROOT_PATH, 'xlsx', 'media_classification', 'media_classification_error_20230105111948.xlsx'),
            //     'inputFile': path.join(ROOT_PATH, 'xlsx', 'check_media', `media_data_info_20241211105006.xlsx`),
            //     'outputFile': path.join(ROOT_PATH, 'xlsx', 'check_media', `media_data_info_20241211105006.xlsx`),
            // },
            // // 媒资归类
            // 'media_classification': {
            //     'switch': false,
            //     'name': 'media_classification',
            //     'inputs': [
            //         path.join(ROOT_PATH, '../', '20241104'),
            //     ],
            //     'output': path.join(ROOT_PATH, '../', 'song_1w'),
            //     'outputFile': path.join(ROOT_PATH, 'xlsx', 'media_classification', `media_data_info_success_${now}.xlsx`),
            //     'errDir': path.join(ROOT_PATH, 'xlsx', 'media_classification', `media_classification_error_${now}.xlsx`)
            // },
        }
    }
};


module.exports = {
    ...CORE_CONFIG
};
