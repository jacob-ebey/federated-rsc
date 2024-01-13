import {FederationRuntimePlugin} from '@module-federation/runtime/types';

export default function (): FederationRuntimePlugin {
    return {
        name: 'rsc-internal-plugin',
        beforeInit(args) {
            args.options.remotes.forEach((remote: any) => {
                if (remote.entry.includes('[public_path]')) {
//@ts-ignore
                    remote.entry = __webpack_require__.p + remote.entry.split('[public_path]')[1]
                }
            })
            return args;
        },
        errorLoadRemote({id, error, from, origin}) {
            console.error(id, 'was unreachable from', from);
            console.error(error);
            const Fallback = function () {
                return 'Federation fallback component';
            };
            let mod;
            if (from === 'build') {
                mod = () => ({
                    __esModule: true,
                    default: Fallback,
                });
            } else {
                mod = {
                    default: Fallback,
                };
            }
            return mod;
        },
    };
}
