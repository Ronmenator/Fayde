module Fayde {
    export interface IThemeManager {
        LoadAsync(themeName: string): Promise<any>;
        FindStyle(defaultStyleKey: any): Style;
    }

    export var DEFAULT_THEME_NAME = "Metro";

    class ThemeManagerImpl implements IThemeManager {
        private $$libs: ThemedLibrary[] = [];
        private $$activeThemeName: string = null;

        constructor() {
            Fayde.TypeManager.libResolver.libraryCreated.on(this.$$onLibraryCreated, this);
            this.$$libs.push(<ThemedLibrary><any>Fayde.CoreLibrary);
        }

        private $$onLibraryCreated(sender: any, args: nullstone.ILibraryCreatedEventArgs) {
            var tlib = <ThemedLibrary>args.library;
            (<any>tlib).$$activeThemeName = this.$$activeThemeName;
            this.$$libs.push(tlib);
        }

        LoadAsync(themeName?: string): Promise<any> {
            if (!themeName)
                themeName = this.$$activeThemeName;
            this.$$activeThemeName = themeName;
            this.$$libs.forEach(lib => lib.setThemeName(themeName));
            return Promise.all(this.$$libs
                .filter(lib => lib.isLoaded)
                .map(lib => lib.loadActiveTheme()));
        }

        FindStyle(defaultStyleKey: any): Style {
            if (!defaultStyleKey)
                return null;
            var uri = defaultStyleKey.$$uri;
            if (uri) {
                var lib = this.$$findLib(uri);
                if (lib && lib.activeTheme)
                    return lib.activeTheme.GetImplicitStyle(defaultStyleKey);
            }
            return null;
        }

        private $$findLib(uri: string): ThemedLibrary {
            for (var i = 0, libs = this.$$libs; i < libs.length; i++) {
                var lib = libs[i];
                if (lib.uri.toString() === uri)
                    return lib;
            }

        }
    }

    export var ThemeManager: IThemeManager = new ThemeManagerImpl();
}