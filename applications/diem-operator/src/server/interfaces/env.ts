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
    packname: string /** @param packname name from package.json */;
    version: string /** @param version version from package.json */;
}
