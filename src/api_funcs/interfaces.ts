export interface IAccount {
  nickname: string;
  FIO: {
    firstName: string;
    middleName: string;
    lastName: string;
  };
  mail: string;
  role: {
    name: string;
    isAdminFun: boolean;
    isClientFun: boolean;
  };
  money: number;
  likeMoney: number;
  class: {
    char: string;
    act: number;
  };
}

export const instanceofIAcc = (object: any): object is IAccount => {
  return (
    "nickname" in object &&
    "FIO.firstName" in object &&
    "FIO.middleName" in object &&
    "FIO.lastName" in object &&
    "mail" in object &&
    "role.name" in object &&
    "role.isAdminFun" in object &&
    "role.isClientFun" in object &&
    "money" in object &&
    "likeMoney" in object &&
    "class.char" in object &&
    "class.act" in object
  );
};
