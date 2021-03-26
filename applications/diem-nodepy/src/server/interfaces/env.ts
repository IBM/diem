/**
 * Common environment for all modules
 *
 * @export
 * @interface IntEnv
 */
export interface IntEnv {
    NODE_ENV: string;
    app: string;
    description: string /** @param description description from package.json */;
    K8_APP: string;
    K8_SYSTEM: string;
    K8_SYSTEM_NAME: string;
    client: string;
    packname: string /** @param packname name from package.json */;
    version: string /** @param version version from package.json */;
}

export interface IXorg {
    current: {
        org: string;
        role: string;
        rolenbr: number;
    };
    orgs: string[];
}

export interface OICUser {
    _json: {
        name: string;
        email: string;
        blueGroups?: string[];
    };
    displayName: string;
    id: string;
}

export interface IntPassportUser extends OICUser {
    email: string;
    id: string;
    name: string;
    org: string;
    role: string;
    rolenbr: number;
    roles: string[];
    uid: string;
    xorg: IXorg;
}
