import { IServiceSessionData } from "../types"

export const BLANK_SERVICE_NAME = "_blank_service_name_"
export const BLANK_SERVICE_SESSION_ID = "_blank_session_id_"
export const DEFAULT_INCREMENTAL_EXPIRITY_OPT = true
export const DEFAULT_SERVICE_SESSION_EXPIRITY = 1000 * 60 * 60 * 24 * 2 // 2 days
export const MODULE_SESSION_ID_MARK = "@"
export const SERVICE_METADATA_KEY = Symbol('serviceCmdMetadata');
export const ARG_METADATA_KEY = Symbol('argMetadata')

export const CreateDefaultServiceSessionData: () => IServiceSessionData = () => {
    return {
        createTime: Date.now(),
        expirity: DEFAULT_SERVICE_SESSION_EXPIRITY,
        initialExpirity: DEFAULT_SERVICE_SESSION_EXPIRITY,
        incrementalExpirity: DEFAULT_INCREMENTAL_EXPIRITY_OPT
    } as IServiceSessionData
}
