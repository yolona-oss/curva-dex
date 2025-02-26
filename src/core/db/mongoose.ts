import mongoose from 'mongoose';

import log from '@utils/logger'
import { timeoutPromise } from '@core/utils/time';

export const MongoConnect = (uri: string, options: any, timeout = 5000): Promise<void> => {
    const conn_promise = new Promise<void>(resolve => {
        log.echo("Connecting to mongoose...")
        mongoose.connect(uri, options);
        mongoose.connection.once('open', () => {
            log.echo("Mongodb is connected.")
            resolve()
        })
    })
    return Promise.race([
        conn_promise,
        timeoutPromise(timeout)
    ])
};
