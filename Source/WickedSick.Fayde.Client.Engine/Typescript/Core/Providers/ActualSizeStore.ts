/// <reference path="PropertyStore.ts" />
/// CODE

module Fayde.Providers {
    export class ActualSizeStore extends PropertyStore {
        static Instance: ActualSizeStore;

        GetValue(storage: IPropertyStorage): number { return storage.Local; }
        GetValuePrecedence(storage: IPropertyStorage): PropertyPrecedence { return PropertyPrecedence.LocalValue; }

        SetLocalValue(storage: Providers.IPropertyStorage, newValue: number) {
            var oldValue = storage.Local;
            storage.Local = newValue;
            if (oldValue === newValue)
                return;
            this.OnPropertyChanged(storage, PropertyPrecedence.LocalValue, oldValue, newValue);
        }
        SetLocalStyleValue(storage: IPropertyStorage, newValue: any) { }
        SetImplicitStyle(storage: IPropertyStorage, newValue: any) { }

        ClearValue(storage: Providers.IPropertyStorage, notifyListeners?: bool) { }
    }
    ActualSizeStore.Instance = new ActualSizeStore();
}