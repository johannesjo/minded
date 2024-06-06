// NOTE: does not work at top level, but needs to be called from inside a solid component at least or after timeout

export const isMain = (): boolean => "IS_MAIN_MINDED_6622" in window;
