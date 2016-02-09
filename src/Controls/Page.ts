/// <reference path="UserControl.ts" />
/// <reference path="../Core/XamlObjectCollection.ts" />

module Fayde.Controls {

    export class PageState extends DependencyObject {
        private _IsSealed: boolean = false;
        
        static VisualStateNameProperty = DependencyProperty.Register("VisualStateName", () => String, PageState);
        static DeviceProperty = DependencyProperty.Register("Device", () => String, PageState);
        static MinXProperty = DependencyProperty.Register("MinX", () => Number, PageState);
        static MinYProperty = DependencyProperty.Register("MinY", () => Number, PageState);
        static MaxXProperty = DependencyProperty.Register("MaxX", () => Number, PageState);
        static MaxYProperty = DependencyProperty.Register("MaxY", () => Number, PageState);
        
        VisualStateName: string;
        Device: string;
        MinX: number;
        MinY: number;
        MaxX: number;
        MaxY: number;

        Seal () {
            this._IsSealed = true;
        }

        static Compare (state1: PageState, state2: PageState): number {
            var a = state1.VisualStateName;
            var b = state2.VisualStateName;
            return a.localeCompare(b);
        }
    }
    
    Fayde.CoreLibrary.add(PageState);
    
    export class PageStateCollection extends XamlObjectCollection<PageState> {
        private _IsSealed: boolean = false;
        XamlNode: XamlNode;

        Seal () {
            if (this._IsSealed)
                return;
            for (var en = this.getEnumerator(); en.moveNext();) {
                en.current.Seal();
            }
            this._IsSealed = true;
        }

        AddingToCollection (value: PageState, error: BError): boolean {
            if (!value || !this._ValidatePageState(<PageState>value, error))
                return false;
            return super.AddingToCollection(value, error);
        }

        private _ValidatePageState (state: PageState, error: BError) {
            if (state.VisualStateName === undefined) {
                error.Message = "PageState.VisualStateName is required.";
                return false;
            }
            if (state.MinX === undefined || state.MaxX === undefined || state.MinY === undefined || state.MaxY === undefined) {
                error.Message = "PageState.(MinX, MaxX, MinY, MaxY) must have Values.";
                return false;
            }
            if (this._IsSealed) {
                error.Message = "PageState is sealed.";
                return false;
            }
            state.Seal();
            return true;
        }        
    }
    Fayde.CoreLibrary.add(PageStateCollection);

    export class Page extends UserControl {
        static TitleProperty = DependencyProperty.Register("Title", () => String, Page);
        static StatesProperty = DependencyProperty.RegisterImmutable<PageStateCollection>("States", () => PageStateCollection, Page);
        States: PageStateCollection;
        Title: string;

        constructor() {
            super();
            this.DefaultStyleKey = Page;
            
            // Initialize the page states
            Page.StatesProperty.Initialize(this).AttachTo(this);
            this.SizeChanged.on(this._UpdateState, this);
                        
            if (window.orientation === undefined) return; // only if the browser/device we are on supports the orientation flag
            // Subscribe to PC Orientation Changes
            window.addEventListener("deviceorientation", this._OrientationChanged, true);
        }
        
        private _OrientationChanged(ev: DeviceOrientationEvent) {
            // alpha value ranges from 0 to 360 around the Z axis where 0 is Portrait, 90 is Landscape rotated to the left
            var alpha = ev.alpha;
            
            if (alpha >= 45)
            
        }
        
        private _UpdateState(sender, e: nullstone.IEventArgs) {
            if (this.States === undefined) {
                this.SizeChanged.off(this._UpdateState, this);
                return;
            }
            var width = window.innerWidth;
            var height = window.innerHeight;
            var enumerator = this.States.getEnumerator();
            while(enumerator.moveNext()) {
                var item = <PageState>enumerator.current;
                if (item === undefined) continue;
                if (width >= item.MinX && width <= item.MaxX &&
                    height >= item.MinY && height <= item.MaxY){
                    this._goToState(item.VisualStateName);
                    break;
                }
            }
        }
        
        private _goToState(state: string){
            Media.VSM.VisualStateManager.GoToState(this, state, true);
        }
        
        static GetAsync(initiator: DependencyObject, url: string): Promise<Page> {
            return Markup.Resolve(url)
                .then(xm => {
                    TimelineProfile.Parse(true, "Page");
                    var page = Markup.Load<Page>(initiator.App, xm);
                    TimelineProfile.Parse(false, "Page");
                    if (!(page instanceof Controls.Page))
                        throw new Error("Markup must be a Page.");
                    return page;
                });
        }
    }
    Fayde.CoreLibrary.add(Page);
}