import { v4 as uuidv4 } from 'uuid';

export interface LogContext {
    correlationId?: string;
    traceId?: string;
    service?: string;
    [key: string]: any;
}

export interface LogEntry {
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    timestamp: string;
    context?: LogContext;
    error?: any;
}

export class Logger {
    private defaultContext: LogContext;

    constructor(defaultContext: LogContext = {}) {
        this.defaultContext = defaultContext;
    }

    private log(level: LogEntry['level'], message: string, context?: LogContext, error?: any) {
        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            context: { ...this.defaultContext, ...context },
            // If error is an Error object, pull out stack/message
            error: error instanceof Error ? { message: error.message, stack: error.stack, name: error.name } : error
        };

        // Output as single-line JSON for easy parsing by log aggregators
        console.log(JSON.stringify(entry));
    }

    info(message: string, context?: LogContext) {
        this.log('info', message, context);
    }

    warn(message: string, context?: LogContext) {
        this.log('warn', message, context);
    }

    error(message: string, error?: any, context?: LogContext) {
        this.log('error', message, context, error);
    }

    debug(message: string, context?: LogContext) {
        // Could implement log level filtering here
        this.log('debug', message, context);
    }

    // Helper to create a child logger with bound context
    child(context: LogContext): Logger {
        return new Logger({ ...this.defaultContext, ...context });
    }
}

export const createLogger = (serviceName: string) => {
    return new Logger({ service: serviceName });
};
