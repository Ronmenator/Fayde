class TestObject {
    Value: any;

    constructor(val) {
        this.Value = val;
    }
}

class ComboBoxViewModel extends Fayde.MVVM.ViewModelBase {
    TestValue: TestObject;
    TestValues: Fayde.Collections.ObservableCollection<TestObject>;
    Command: Fayde.MVVM.RelayCommand;
    Ctr: number = 0;

    constructor() {
        super();
        this.TestValues = new Fayde.Collections.ObservableCollection<TestObject>();
        this.Command = new Fayde.MVVM.RelayCommand(par => this.SetSelectedValue());

        for (let index = 0; index < 200; index++) {
            this.TestValues.Add(new TestObject("Test " + index));
        }
        
        this.test();
    }
    
    test() {
        this.TestValue = this.TestValues.GetValueAt(100);
    }

    SetSelectedValue() {
        if (this.Ctr >= this.TestValues.Count)
            this.Ctr = 0;
        this.TestValue = this.TestValues.GetValueAt(this.Ctr++);
    }
}

Fayde.MVVM.AutoModel(ComboBoxViewModel)
    .Notify("TestValue", "TestValues", "Command")
    .Finish();
export = ComboBoxViewModel;