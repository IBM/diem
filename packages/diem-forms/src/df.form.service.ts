/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core';
import { HttpService } from '@mydiem/diem-angular-util';
import { cloneDeep } from 'lodash-es';
import { IFormSpecs } from './definitions/interfaces';
import * as def from './definitions/index';

/**
 * Form Service
 *
 * @function getStoredForm
 * @function setStoredForm
 * @function getFormProperties
 * @class DFFormService
 */
@Injectable()
export class DFFormService {
    public storedForms: any = {};
    private http: HttpService;

    public constructor(http: HttpService) {
        this.http = http;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getStoredForm(formName: string, _reset: boolean = false): any {
        return cloneDeep(this.storedForms[formName]);
    }

    public setStoredForm(formName: string, formData: any): any {
        this.storedForms[formName] = cloneDeep(formData);
    }

    public getFormProperties(url: string): any {
        return this.http.httpGet(`${url}&rnd=${new Date().getTime()}`);
    }

    public getQuestionGroups(body: IFormSpecs): any {
        if (!body || !body.groups || !Array.isArray(body.groups)) {
            return [];
        }
        const groups: def.QuestionGroup<any>[] = [];
        body.groups.forEach((group: any) => {
            if (group.tabs) {
                const tabgroups: def.QuestionGroup<any>[] = [];
                group.tabs.forEach((tab: any) => {
                    tab.questions = this.parseGroup(tab.questions);
                    tabgroups.push(new def.QuestionGroup(tab));
                });
                group.tabs = tabgroups;
                groups.push(group);
            } else {
                group.questions = this.parseGroup(group.questions);
                groups.push(new def.QuestionGroup(group));
            }
        });

        return groups;
    }

    public filterOptions(options: any, parentValue: string, placeHolder?: string): any {
        const filteredOptions: any = [];
        if (options.length > 0) {
            options.forEach((option: any) => {
                if (option.group === parentValue) {
                    filteredOptions.push(option);
                }
            });
        }

        return this.parseSelectOptions(filteredOptions, placeHolder);
    }

    public getButtons: any = (body: any): any => body.buttons;

    public getFormStyle: any = (body: any): any => body.style;

    public getPermissions: any = (body: any): any => body.roles;

    public getListForm: any = (body: any): any => body.list;

    private parseGroup: any = (groupQuestions: any): any => {
        const questions: def.QuestionBase<any>[] = [];

        /* tslint:disable cyclomatic-complexity*/
        groupQuestions.forEach((question: any) => {
            if (question.options) {
                question.optionsInfo = question.options;
                question.options = this.parseSelectOptions(question.options, question.placeHolder);
            }

            switch (question.controlType) {
                case 'textbox':
                    questions.push(new def.TextboxQuestion(question));
                    break;
                case 'dropdown':
                    questions.push(new def.DropdownQuestion(question));
                    break;
                case 'textarea':
                    questions.push(new def.TextareaQuestion(question));
                    break;
                case 'editor':
                    questions.push(new def.EditorQuestion(question));
                    break;
                case 'codeeditor':
                    questions.push(new def.CodeEditorQuestion(question));
                    break;
                case 'mermaid':
                    questions.push(new def.MermaidQuestion(question));
                    break;
                case 'text':
                    questions.push(new def.TextQuestion(question));
                    break;
                case 'fileViewer':
                    questions.push(new def.FileViewerQuestion(question));
                    break;
                case 'icon':
                    questions.push(new def.IconQuestion(question));
                    break;
                case 'button':
                    questions.push(new def.ButtonQuestion(question));
                    break;
                case 'radio':
                    questions.push(new def.RadioQuestion(question));
                    break;
                case 'checkbox':
                    questions.push(new def.CheckboxQuestion(question));
                    break;
                case 'toggle':
                    questions.push(new def.ToggleQuestion(question));
                    break;
                case 'tooltip':
                    questions.push(new def.TooltipQuestion(question));
                    break;
                case 'number':
                    questions.push(new def.NumberQuestion(question));
                    break;
                case 'overflow':
                    questions.push(new def.OverflowQuestion(question));
                    break;
                case 'chips':
                    questions.push(new def.ChipsQuestion(question));
                    break;
                case 'autocomplete':
                    questions.push(new def.AutoCompleteQuestion(question));
                    break;
                case 'calendar':
                    questions.push(new def.CalendarQuestion(question));
                    break;
                case 'upload':
                    questions.push(new def.UploadQuestion(question));
                    break;
                case 'repeater':
                    questions.push(new def.RepeaterQuestion(question));
                    break;
                case 'table':
                    questions.push(new def.TableQuestion(question));
                    break;
                default:
                    console.info(`question type undefined: ${question.controlType}`);
            }
        });

        return questions.sort((a, b) => {
            if (a && a.order && b && b.order) {
                return a.order - b.order;
            }

            return 0;
        });
    };

    private parseSelectOptions: any = (options: any, placeHolder?: string): any => {
        const parsedOptions: { content: string; id: string }[] = [];
        if (placeHolder) {
            parsedOptions.push({ content: placeHolder, id: '' });
        }

        if (options.length > 0) {
            options.forEach((option: any) => {
                const val: any = option.value ? option.value : option;

                parsedOptions.push({ content: val, id: val });
            });
        }

        return parsedOptions;
    };
}
