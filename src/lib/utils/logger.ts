import { Logger } from 'tslog';
import { appendFileSync } from 'fs';
import type { ILogger } from '@/lib/types/logger';

/**
 * Map string log level to tslog numeric level.
 */
const logLevelMap = {
    silly: 0,
    trace: 1,
    debug: 2,
    info: 3,
    warn: 4,
    error: 5,
    fatal: 6,
} as const;

/**
 * Create a configured tslog logger instance.
 * @param config Logging config from app config
 * @returns ILogger instance
 */
export function createAppLogger(config: { level: keyof typeof logLevelMap; name?: string; logToFile?: boolean; logFilePath?: string }): ILogger {
    const minLevel = logLevelMap[config.level] ?? 3; // default to 'info'
    const tslogLogger = new Logger({
        type: 'pretty',
        name: config.name || 'TSLog',
        minLevel,
        prettyLogTemplate: '{{yyyy}}-{{mm}}-{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t',
        prettyErrorTemplate: '\n{{errorName}} {{errorMessage}}\nerror stack:\n{{errorStack}}',
        prettyErrorStackTemplate: '  • {{fileName}}\t{{method}}\n\t{{filePathWithLine}}',
        prettyErrorParentNamesSeparator: ':',
        prettyErrorLoggerNameDelimiter: '\t',
        stylePrettyLogs: false,
        prettyLogTimeZone: 'local',
        prettyLogStyles: {
            logLevelName: {
                '*': ['bold', 'black', 'bgWhiteBright', 'dim'],
                SILLY: ['bold', 'white'],
                TRACE: ['bold', 'whiteBright'],
                DEBUG: ['bold', 'green'],
                INFO: ['bold', 'blue'],
                WARN: ['bold', 'yellow'],
                ERROR: ['bold', 'red'],
                FATAL: ['bold', 'redBright'],
            },
            dateIsoStr: 'white',
            filePathWithLine: 'white',
            name: ['white', 'bold'],
            nameWithDelimiterPrefix: ['white', 'bold'],
            nameWithDelimiterSuffix: ['white', 'bold'],
            errorName: ['bold', 'bgRedBright', 'whiteBright'],
            fileName: ['yellow'],
        },
    });
    if (config.logToFile) {
        tslogLogger.attachTransport((logObj: unknown) => {
            appendFileSync(config.logFilePath || 'logs', JSON.stringify(logObj) + '\n');
        });
    }
    return tslogLogger as unknown as ILogger;
}
