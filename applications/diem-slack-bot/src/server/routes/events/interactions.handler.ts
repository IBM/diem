import { utils } from '@common/utils';
import { EComponents, IRequest, IResponse, IArgsBody, IError } from '@interfaces';
import { isVerified } from '../../config/verifysignature';
import { serviceHandler } from './service.handler';

export const interactionsHander: (req: IRequest, res: IResponse) => Promise<any> = async (req, res) => {
    if (!isVerified(req)) {
        utils.logInfo('$interaction (interactions): unverfied request');

        return res.status(400).send();
    }
    // interactions is always a json payload
    const payload = JSON.parse(req.body.payload);

    res.status(200).send();

    if (payload.type === 'view_submission') {
        // we need to know what component is handling this view_submission

        const id = payload.view.callback_id;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            const err: any = {
                message: 'Invalid id',
                id,
                trace: '@at $interactions.handler (interactionsHander) - view_submission',
            };

            void utils.logError('$interactions.handler (interactionsHander) - view_submission', err);

            return;
        }

        const args: IArgsBody = {
            id,
            component: EComponents.service,
            params: {
                id,
                component: EComponents.service,
                action: payload.view.private_metadata || payload.type,
                payload,
                event: undefined,
                user: payload.user,
            },
        };

        //console.info('args', payload.view.state.values);

        await serviceHandler(payload, args).catch(async (err: IError) => {
            err.trace = utils.addTrace(err.trace, '@at $interactions.handler (interactionsHander) - view_submission');

            void utils.logError('$interactions.handler (interactionsHander) - view_submission', err);

            return Promise.reject(err);
        });

        return;
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
                user: payload.user,
            },
        };

        void serviceHandler(payload, args).catch(async (err: IError) => {
            err.trace = utils.addTrace(err.trace, '@at $interactions.handler (interactionsHander) - view_submission');

            void utils.logError('$interactions.handler (interactionsHander) - view_submission', err);

            return;
        });

        return;
    }

    return;
};
