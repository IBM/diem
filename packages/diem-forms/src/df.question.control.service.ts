/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';

import { QuestionBase } from './definitions/question-base';
import { IQuestion } from './definitions/interfaces';
import { QuestionGroup } from './definitions/question-group';

export interface IWatchField {
    watch: string;
    condition: string;
    disable: boolean;
    field: QuestionBase<any>;
    keepValue: boolean;
    type: string;
}

@Injectable()
export class DFQuestionControlService {
    public toFormGroup: any = (
        questionGroups: QuestionGroup<any>[],
        validations: QuestionBase<any>[],
        questions: IQuestion[],
        keyNames: string[]
    ): FormGroup => {
        if (questionGroups.length === 0) {
            return new FormGroup({});
        }
        const formGroup: any = {};

        const q: IQuestion[] = [];

        questionGroups.forEach((group) => {
            if (group.tabs) {
                group.tabs.forEach((tabsGroup: any) => {
                    tabsGroup.questions.forEach((question: IQuestion) => {
                        q.push(question);
                    });
                });
            } else {
                group.questions.forEach((question: IQuestion) => {
                    q.push(question);
                });
            }
        });

        q.forEach((question: IQuestion) => {
            const validators: any[] = this.getValidators(question);

            if (validators.length > 0) {
                validations.push(question);
            }

            const controlValue: { disabled: boolean | string; value: any } = {
                disabled: typeof question.disabled === 'string' ? false : question.disabled,
                value: question.value,
            };

            const formCtrl: FormControl = new FormControl(controlValue, {
                validators,
            });

            if (question.key) {
                formGroup[question.key] = formCtrl;
                keyNames.push(question.key);
            }
            questions.push(question);
        });

        return new FormGroup(formGroup);
    };

    public markFormGroupTouched: any = (formGroup: FormGroup) => {
        Object.keys(formGroup.controls)
            .map((key: string) => formGroup.controls[key])
            .forEach((control: AbstractControl) => {
                if (!control.disabled) {
                    control.markAsTouched();
                    control.markAsDirty();
                }
            });
    };

    public changeFormState(form: FormGroup, questions: QuestionBase<any>[], newState: string): void {
        questions.forEach((question) => {
            this.changeFieldState(form, question, newState);
        });
    }

    public changeFieldState: any = (form: FormGroup, question: QuestionBase<any>, newState: string): void => {
        if (question.key) {
            const q: any = form.get(question.key);

            if (!q) {
                return;
            }

            switch (newState) {
                case 'disable':
                    q.disable(true);
                    break;
                case 'enable':
                    q.enable(true);
                    break;
                default:
                    break;
            }
        }
    };

    public parseCondition = (condition: string): string => condition.split('$$').join('this.form.value.');

    public getQuestion: any = (key: string, formQuestions: QuestionBase<any>[]): any => {
        for (const q of formQuestions) {
            if (q.key === key) {
                return q;
            }
        }
    };

    // eslint-disable-next-line sonarjs/cognitive-complexity
    public getGroupQuestion: any = (key: string, formGroupQuestions: QuestionGroup<any>[]): any => {
        for (const g of formGroupQuestions) {
            if (g.tabs) {
                for (const t of g.tabs) {
                    for (const q of t.questions) {
                        if (q.key === key) {
                            return q;
                        }
                    }
                }
            } else {
                for (const q of g.questions) {
                    if (q.key === key) {
                        return q;
                    }
                }
            }
        }
    };

    public getDependents = (
        question: QuestionBase<any>,
        fieldsToWatch: IWatchField[],
        formQuestions: QuestionBase<any>[]
    ): IWatchField[] => {
        if (question.dependency) {
            question.dependency.forEach((dep) => {
                if (dep.condition) {
                    dep.condition = this.parseCondition(dep.condition);
                }

                if (typeof dep.watch === 'string') {
                    fieldsToWatch.push({
                        condition: dep.condition,
                        disable: dep.disable,
                        field: this.getQuestion(dep.key, formQuestions),
                        keepValue: dep.keepValue,
                        type: dep.type,
                        watch: dep.watch,
                    });
                } else {
                    dep.watch.forEach((ndep) => {
                        fieldsToWatch.push({
                            condition: dep.condition,
                            disable: dep.disable,
                            field: this.getQuestion(dep.key, formQuestions),
                            keepValue: dep.keepValue,
                            type: dep.type,
                            watch: ndep,
                        });
                    });
                }
            });
        }

        return fieldsToWatch;
    };

    public getValidators: any = (question: QuestionBase<any>) => {
        const validators: any[] = [];

        if (question && question.required) {
            validators.push(Validators.required);
        }

        if (question && question.minLength) {
            validators.push(Validators.minLength(question.minLength));
        }

        if (question && question.maxLength) {
            validators.push(Validators.maxLength(question.maxLength));
        }

        if (question && question.max) {
            validators.push(Validators.max(question.max));
        }

        if (question && question.min) {
            validators.push(Validators.min(question.min));
        }

        return validators;
    };
}
