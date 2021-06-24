import { utils } from '@common/utils';
import { IRequest, IResponse } from '@interfaces';
import { isVerified } from '../../config/verifysignature';
import { homeHandler, messageHandler } from '../routes';

export const eventHandler: (req: IRequest, res: IResponse) => Promise<IResponse> = async (
    req,
    res
): Promise<IResponse> => {
    // return if not is verified
    if (!isVerified(req)) {
        utils.logInfo('$event (eventHandler): unverfied request');

        return res.status(400).send();
    }

    // collect the event
    const event: { type: string; bot_id: string; event: any } = req.body;

    // if no event , the nothing to handle
    if (!event) {
        utils.logInfo(`$event (eventHandler): not an event: ${event}`);

        return res.status(400).send();
    }

    if (event.type === 'url_verification') {
        utils.logInfo('$event (eventHandler): challenge event');

        return res.send({ challenge: req.body.challenge });
    }

    if (event.type === 'event_callback') {
        if (event.bot_id || event?.event.bot_id) {
            return res.status(200).send();
        }

        if (!event.event) {
            utils.logInfo('$event (eventHandler): unknown event:', JSON.stringify(event));

            return res.status(200).send();
        }

        // handle the events event

        // console.info('main event', event);
        const response: boolean | any = await handleEvent(event.event).catch(async (err) => {
            err.trace = utils.addTrace(err.trace, '@at $event.handler (eventHandler) - response');

            void utils.logError('$event.handler (eventHandler) - response', err);

            return res.status(200).send();
        });

        if (response === false) {
            return res.status(200).send();
        } else {
            return res.status(200).send(response);
        }
    }

    utils.logInfo(`$event (eventHandler): cannot handle this type of event: ${event}`);

    return res.status(404).send();
};

const handleEvent: (event: any) => Promise<boolean | any> = async (event: any): Promise<boolean | any> => {
    let response: boolean | any;

    if (['message', 'app_mention'].includes(event.type)) {
        response = await messageHandler(event).catch(async (err) => {
            err.trace = utils.addTrace(err.trace, '@at $event.handler (handleEvent) - messageHandler');

            return Promise.reject(err);
        });
    } else if (event.type === 'app_home_opened') {
        response = await homeHandler(event).catch(async (err) => {
            err.trace = utils.addTrace(err.trace, '@at $event.handler (handleEvent) - homeHandler');

            return Promise.reject(err);
        });
    } else {
        utils.logInfo(`$event (handleEvent): not handled event: ${event.type}`);

        return Promise.resolve(false);
    }

    utils.logInfo(`$event (handleEvent): handled event: ${event.type}`);

    return Promise.resolve(response);
};
