import { utils } from '@common/utils';
import { EComponents, IRequest, IResponse, IArgsBody } from '@interfaces';
import { isVerified } from '../../config/verifysignature';
import { serviceHandler } from './service.handler';

export const interactionsHander: (req: IRequest, res: IResponse) => Promise<any> = async (req, res) => {
    if (!isVerified(req)) {
        utils.logInfo('$interaction (interactions): unverfied request');

        return res.status(400).send();
    }
    // interactions is always a json payload
    const payload = JSON.parse(req.body.payload);

    if (payload.type === 'view_submission') {
        // we need to know what component is handling this view_submission

        res.status(200).send();

        const id = payload.view.callback_id;

        const args: IArgsBody = {
            id,
            component: EComponents.service,
            params: {
                id,
                component: EComponents.service,
                action: payload.type,
                payload,
                event: undefined,
            },
        };

        //console.info('args', payload.view.state.values);

        void serviceHandler(payload, args);
    } else if (payload.type === 'block_actions') {
        // acknowledge the event before doing heavy-lifting on our servers
        res.status(200).send();

        const actions = payload.actions[0];
        const action = actions.action_id;
        const id: string = actions.block_id;

        const args: IArgsBody = {
            id,
            component: EComponents.service,
            params: {
                id,
                component: EComponents.service,
                action,
                payload,
                event: undefined,
            },
        };

        void serviceHandler(payload, args);
    }

    return res.status(404).send();
};
