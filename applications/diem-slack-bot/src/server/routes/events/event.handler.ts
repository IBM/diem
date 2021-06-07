import { utils } from '@common/utils';
import { IRequest, IResponse } from '@interfaces';
import { isVerified } from '../../config/verifysignature';
import { homeHandler, messageHandler } from '../routes';

export const eventHandler: (req: IRequest, res: IResponse) => Promise<any> = async (req, res) => {
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
        void handleEvent(event.event);

        return res.status(200).send();
    }

    utils.logInfo(`$event (eventHandler): cannot handle this type of event: ${event}`);

    return res.status(404).send();
};

const handleEvent = async (event: any): Promise<any> => {
    if (['message', 'app_mention'].includes(event.type)) {
        return void messageHandler(event);
    }

    if (event.type === 'app_home_opened') {
        return void homeHandler(event);
    }

    utils.logInfo(`$event (handleEvent): not handled event: ${event.type}`);
};
