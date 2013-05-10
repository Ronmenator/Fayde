/// <reference path="../../Runtime/EventArgs.ts" />
/// CODE

module Fayde.Controls.Primitives {
    export class SelectionChangedEventArgs extends EventArgs {
        OldValues: any[];
        NewValues: any[];
        constructor(oldValues: any[], newValues: any[]) {
            super();
            Object.defineProperty(this, "OldValues", { value: oldValues.slice(0), writable: false });
            Object.defineProperty(this, "NewValues", { value: newValues.slice(0), writable: false });
        }
    }
    Nullstone.RegisterType(SelectionChangedEventArgs, "SelectionChangedEventArgs");
}