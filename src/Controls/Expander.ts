/// <reference path="ContentControl" />
/// <reference path="Primitives/ToggleButton" />
/// <reference path="../Core/DataTemplate" />

module Fayde.Controls {
	export class Expander extends ContentControl {
		private $useTransitions = true;
		private $toggleExpander: Primitives.ToggleButton;
        
        HeaderContent: any;
        IsExpanded: boolean;
        CornerRadius: CornerRadius;
        HeaderContentTemplate: DataTemplate;
		
        static HeaderContentProperty = DependencyProperty.Register("HeaderContent", () => Object, Expander);
        static HeaderContentTemplateProperty = DependencyProperty.Register("HeaderContentTemplate", () => DataTemplate, Expander);
        static IsExpandedProperty = DependencyProperty.Register("IsExpanded", () => Boolean, Expander, true);
        static CornerRadiusProperty = DependencyProperty.Register("CornerRadius", () => CornerRadius, Expander);
        
		constructor() {
            super();
            this.DefaultStyleKey = Expander;
        }
        private _GetChildOfType(name: string, type: Function): any {
            var temp = this.GetTemplateChild(name);
            if (temp instanceof type)
                return temp;
        }
        OnApplyTemplate() {
            super.OnApplyTemplate();
            this.UpdateVisualState(false);

            this.$toggleExpander = this._GetChildOfType("ExpandCollapseButton", Primitives.ToggleButton);

            if (this.$toggleExpander !== undefined) {
                this.$toggleExpander.Checked.on(this._OnToggleChecked, this);
                this.$toggleExpander.Unchecked.on(this._OnToggleUnchecked, this);
            }
            
            this.UpdateVisualState(false);
        }

        private _OnToggleChecked(sender, e) { 
            this.UpdateVisualState(true);
        }

        private _OnToggleUnchecked(sender, e) { 
            this.UpdateVisualState(true);
        }

        GoToStateFocus(gotoFunc: (state: string) => boolean): boolean {
            if (this.IsExpanded) {
                return gotoFunc("Expanded");
            }
            else {
                return gotoFunc("Collapsed");
            }
        }

        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs) {
            this.IsExpanded = !this.IsExpanded;
            super.OnMouseLeftButtonDown(e);
        }
	}
    
    Fayde.CoreLibrary.add(Expander);
    
    TemplateParts(Expander, 
        { Name: "ExpandCollapseButton", Type: Primitives.ToggleButton });
        
    TemplateVisualStates(Expander, 
        { GroupName: "ViewStates", Name: "Collapsed" },
        { GroupName: "ViewStates", Name: "Expanded" });
}
