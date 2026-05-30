export enum Product {
  CROP = 1,
  FERTILIZER = 3,
}

export enum approvalStatus {
  REJECTED = 1,
  PENDING = 2,
  APPROVED = 3,
  LOCKED = 4,
  DISABLED = 5,
}

export enum Action {
  ADD = 'Add',
  EDIT = 'Edit',
  DELETE = 'Delete',
  GET = 'Get',
}

export enum Purpose {
  APPROVAL = 'approval',
  UPDATE_TEMPO = 'updateTempo',
  UPDATE_USERLAND = 'updateUserland',
  TRANSFER = 'transfer',
  RECORD_CHECK = 'recordCheck',
}
