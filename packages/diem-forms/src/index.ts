export { StoreReducer } from './df.store.reducer';
export { DFStoreFunctions } from './df.store.functions';
export { DFFormService } from './df.form.service';
export { DFCommonService } from './df.common.api';
export * from './definitions/interfaces';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppPages, HttpService } from '@mydiem/diem-angular-util';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import {
    DatePickerModule,
    ComboBoxModule,
    DropdownModule,
    NFormsModule,
    NumberModule,
    PaginationModule,
    PanelModule,
    SideNavModule,
    TableModule,
    TabsModule,
    TagModule,
    PlaceholderModule,
    DialogModule,
} from 'carbon-components-angular';

import { AppIconModule } from './icons/icon.module';

import { AceCodeEditorComponent } from './df.aceditor.component';
import { DFBpImgComponent } from './df.bpImg.component';
import { DFButtonsComponent } from './df.buttons.component';
import { DFCommonService } from './df.common.api';
import { DFComponent } from './df.form.component';
import { DFFieldsetGroupComponent } from './df.fieldset.group.component';
import { DFFilterService } from './df.filter.service';
import { DFFormService } from './df.form.service';
import { DFGroupBodyComponent } from './df.group.body.component';
import { DFGroupComponent } from './df.group.component';
import { DFListComponent } from './df.list.component';
import { DFMenuDropDownComponent } from './df.menu.dropdown';
import { DFPanelComponent } from './df.panel.component';
import { DFQuestionComponent } from './df.question.component';
import { DFStandardFormComponent } from './df.standard.form.component';
import { DFStoreFunctions } from './df.store.functions';
import { DFTableListComponent } from './df.table.list.component';
import { Object2Array } from './df.object.array.pipe';
import { PrimeComponents } from './prime.components';
import { TinyEditorComponent } from './df.tinymce.component';
import { MermaidComponent } from './df.mermaid.component';
import { AppIconDirective } from './icons/icon.directive';

export {
    AceCodeEditorComponent,
    AppIconDirective,
    DFBpImgComponent,
    DFButtonsComponent,
    DFComponent,
    DFFieldsetGroupComponent,
    DFGroupBodyComponent,
    DFGroupComponent,
    DFListComponent,
    DFMenuDropDownComponent,
    DFPanelComponent,
    DFQuestionComponent,
    DFStandardFormComponent,
    DFTableListComponent,
    AppIconModule,
    MermaidComponent,
    Object2Array,
    TinyEditorComponent,
};

@NgModule({
    declarations: [
        AceCodeEditorComponent,
        DFBpImgComponent,
        DFButtonsComponent,
        DFComponent,
        DFFieldsetGroupComponent,
        DFGroupBodyComponent,
        DFGroupComponent,
        DFListComponent,
        DFMenuDropDownComponent,
        DFPanelComponent,
        DFQuestionComponent,
        DFStandardFormComponent,
        DFTableListComponent,
        MermaidComponent,
        Object2Array,
        TinyEditorComponent,
    ],
    exports: [
        ...PrimeComponents,
        AppIconModule,
        AceCodeEditorComponent,
        AppPages,
        ComboBoxModule,
        CommonModule,
        DFBpImgComponent,
        DFButtonsComponent,
        DFComponent,
        DFFieldsetGroupComponent,
        DFGroupBodyComponent,
        DFGroupComponent,
        DFListComponent,
        DFMenuDropDownComponent,
        DFPanelComponent,
        DFQuestionComponent,
        DFStandardFormComponent,
        DFTableListComponent,
        DatePickerModule,
        DialogModule,
        DropdownModule,
        FormsModule,
        MermaidComponent,
        NFormsModule,
        NumberModule,
        PaginationModule,
        PanelModule,
        PlaceholderModule,
        ReactiveFormsModule,
        RouterModule,
        SideNavModule,
        TableModule,
        TabsModule,
        TagModule,
        TinyEditorComponent,
    ],
    imports: [
        AppIconModule,
        CommonModule,
        AppPages,
        FormsModule,
        ReactiveFormsModule,
        ...PrimeComponents,
        ComboBoxModule,
        DatePickerModule,
        DialogModule,
        DropdownModule,
        NFormsModule,
        NumberModule,
        PaginationModule,
        PanelModule,
        PlaceholderModule,
        SideNavModule,
        TableModule,
        TabsModule,
        TagModule,
        RouterModule,
    ],
    providers: [DFCommonService, HttpService, DFFilterService, DFStoreFunctions, DFFormService, Store],
})
export class DynamicFormModule {}
