declare const filterPropList: {
    exact(list: string[]): string[];
    contain(list: string[]): string[];
    endWith(list: string[]): string[];
    startWith(list: string[]): string[];
    notExact(list: string[]): string[];
    notContain(list: string[]): string[];
    notEndWith(list: string[]): string[];
    notStartWith(list: string[]): string[];
};
declare const createPropListMatcher: (propList: string[]) => (prop: string) => boolean;
export { filterPropList, createPropListMatcher };
