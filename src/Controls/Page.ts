/// <reference path="UserControl.ts" />
/// <reference path="../Core/XamlObjectCollection.ts" />

module Fayde.Controls {

    export class PageState extends DependencyObject {
        private _IsSealed: boolean = false;

        static VisualStateNameProperty = DependencyProperty.Register("VisualStateName", () => String, PageState, "Normal");
        static DeviceProperty = DependencyProperty.Register("Device", () => new Enum(DeviceType), PageState, DeviceType.PC);
        static MinXProperty = DependencyProperty.Register("MinX", () => Number, PageState, 0);
        static MinYProperty = DependencyProperty.Register("MinY", () => Number, PageState, 0);
        static MaxXProperty = DependencyProperty.Register("MaxX", () => Number, PageState, Number.MAX_VALUE);
        static MaxYProperty = DependencyProperty.Register("MaxY", () => Number, PageState, Number.MAX_VALUE);

        VisualStateName: string;
        Device: DeviceType;
        MinX: number;
        MinY: number;
        MaxX: number;
        MaxY: number;

        Seal() {
            this._IsSealed = true;
        }

        static Compare(state1: PageState, state2: PageState): number {
            var a = state1.VisualStateName;
            var b = state2.VisualStateName;
            return a.localeCompare(b);
        }
    }

    Fayde.CoreLibrary.add(PageState);

    export class PageStateCollection extends XamlObjectCollection<PageState> {
        private _IsSealed: boolean = false;
        XamlNode: XamlNode;

        Seal() {
            if (this._IsSealed)
                return;
            for (var en = this.getEnumerator(); en.moveNext();) {
                en.current.Seal();
            }
            this._IsSealed = true;
        }

        AddingToCollection(value: PageState, error: BError): boolean {
            if (!value || !this._ValidatePageState(<PageState>value, error))
                return false;
            return super.AddingToCollection(value, error);
        }

        private _ValidatePageState(state: PageState, error: BError) {
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
        Device: DeviceType = DeviceType.PC;
        DeviceOrientation: DeviceOrientation = DeviceOrientation.Landscape; // PC is always in Landscape mode

        constructor() {
            super();
            this.DefaultStyleKey = Page;
            
            // Initialize the page states
            Page.StatesProperty.Initialize(this).AttachTo(this);

            this._initializeDeviceType();
            this._initializeSizeChanges();
            this._initializeOrientation();
        }
        
        private _initializeOrientation(){
            window.onorientationchange = (e) => this._OrientationChanged(e);
        }

        private _initializeDeviceType() {
            if (/Mobi/.test(navigator.userAgent))
                this.Device = DeviceType.Phone;
            else
                this.Device = DeviceType.PC;
            // set the initial state for the page
            this._OrientationChanged(null);
            this._goToState(this.Device == DeviceType.PC ? "Landscape" : "Portrait");
        }

        private _initializeSizeChanges() {
            this.SizeChanged.on(this._UpdateState, this);
        }

        private _OrientationChanged(ev: any) {
            if (window.orientation === undefined) return;
            var alpha = window.orientation;
            if (alpha === -90 || alpha === 90) {
                this._goToState("Landscape");
                this.DeviceOrientation = DeviceOrientation.Landscape;
            }
            else {
                this._goToState("Portrait");
                this.DeviceOrientation = DeviceOrientation.Portrait;
            }
        }

        private _UpdateState(sender, e: nullstone.IEventArgs) {
            if (this.States === undefined) {
                this.SizeChanged.off(this._UpdateState, this);
                return;
            }
            var width = window.innerWidth;
            var height = window.innerHeight;
            var enumerator = this.States.getEnumerator();
            while (enumerator.moveNext()) {
                var item = <PageState>enumerator.current;
                if (item === undefined) continue;
                if (width >= item.MinX && width <= item.MaxX &&
                    height >= item.MinY && height <= item.MaxY &&
                    this.Device === item.Device) {
                    this._goToState(item.VisualStateName);
                    break;
                }
            }
        }

        private _goToState(state: string) {
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