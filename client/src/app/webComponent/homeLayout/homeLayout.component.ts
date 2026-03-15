import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
    ɵInternalFormsSharedModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/authService';
import { LoginPayload, SignupPayload } from '../../models/authData';

@Component({
    selector: 'home-layout',
    standalone: true,
    imports: [CommonModule, ɵInternalFormsSharedModule, ReactiveFormsModule],
    templateUrl: './homeLayout.component.html',
    styleUrls: ['./homeLayout.component.css'],
})
export class HomeLayoutComponent implements OnInit {
    private authService = inject(AuthService);
    private router = inject(Router);
    protected readonly title = signal('Home');
    protected isLogin = signal(false);
    private fb = inject(FormBuilder).nonNullable;
    protected loginSubmitted = false;
    protected signupSubmitted = false;
    protected loginErrorMessage = signal('');
    protected signupErrorMessage = signal('');

    formSignup = this.fb.group(
        {
            full_name: ['', [Validators.required]],
            email: ['', [Validators.required, Validators.email]],
            password: [
                '',
                [
                    Validators.required,
                    Validators.minLength(6),
                    Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/),
                ],
            ],
            confirm_password: ['', [Validators.required, Validators.minLength(6)]],
        },
        { validators: [this.passwordsMatchValidator] },
    );

    formLogin = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]],
        remember: [false],
    });

    private passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
        const password = group.get('password')?.value;
        const confirmPassword = group.get('confirm_password')?.value;
        if (!password || !confirmPassword) {
            return null;
        }

        return password === confirmPassword ? null : { passwordMismatch: true };
    }

    ngOnInit() {}

    goToLogin({ isScroll = true } = {}) {
        this.isLogin.set(true);
        this.loginSubmitted = false;
        this.loginErrorMessage.set('');
        this.formLogin.reset();
        if (isScroll) this.scrollToAuth();
    }

    goToSignup({ isScroll = true } = {}) {
        this.isLogin.set(false);
        this.signupSubmitted = false;
        this.signupErrorMessage.set('');
        this.formSignup.reset();
        if (isScroll) this.scrollToAuth();
    }

    private scrollToAuth() {
        const element = document.getElementById('auth-section');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    handleLogin(event: Event) {
        event.preventDefault();
        this.loginSubmitted = true;
        this.loginErrorMessage.set('');
        if (this.formLogin.invalid) {
            this.formLogin.markAllAsTouched();
            return;
        }
        const payload = this.formLogin.value;
        this.authService.login(payload as LoginPayload).subscribe({
            next: (res) => {
                void this.handleAuthSuccess(res);
            },
            error: (error) => {
                console.error(error.error);
                if (error.statusText === 'Unauthorized')
                    this.loginErrorMessage.set('Tài khoản hoặc mật khẩu không chính xác');
                else this.loginErrorMessage.set('Đăng nhập thất bại');
            },
        });
    }

    handleSignup(event: Event) {
        event.preventDefault();
        this.signupSubmitted = true;
        this.signupErrorMessage.set('');
        if (this.formSignup.invalid) {
            this.formSignup.markAllAsTouched();
            return;
        }
        const payload = this.formSignup.value;
        this.authService.signup(payload as SignupPayload).subscribe({
            next: (res) => {
                void this.handleAuthSuccess(res);
            },
            error: (error) => {
                console.error(error.error);

                if (error.statusText === 'Conflict')
                    this.signupErrorMessage.set('Email đăng ký đã tồn tại');
                else this.signupErrorMessage.set('Đăng ký thất bại');
            },
        });
    }

    private async handleAuthSuccess(res: any): Promise<void> {
        const { id, role, full_name, avatar_url, email } = res?.metadata;
        if (!id) {
            await this.router.navigate(['/home']);
            return;
        }

        this.authService.setUserInfo({ id, role, name: full_name, avatarUrl: avatar_url, email });

        await this.router.navigate(['/conversations', id]);
    }

    protected shouldShowError(form: FormGroup, controlName: string, submitted: boolean): boolean {
        const control = form.get(controlName);
        if (!control) {
            return false;
        }

        const passwordMismatch =
            controlName === 'confirm_password' &&
            form.hasError('passwordMismatch') &&
            (control.touched || control.dirty || submitted);

        return (
            (control.invalid && (control.touched || control.dirty || submitted)) || passwordMismatch
        );
    }

    protected getErrorMessage(form: FormGroup, controlName: string): string {
        const control = form.get(controlName);
        if (!control) {
            return '';
        }

        if (control.hasError('required')) {
            return 'Trường này là bắt buộc';
        }
        if (control.hasError('email')) {
            return 'Email không đúng định dạng';
        }
        if (control.hasError('minlength')) {
            const minLength = control.getError('minlength')?.requiredLength;
            return `Cần ít nhất ${minLength} ký tự`;
        }
        if (control.hasError('pattern')) {
            return 'Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt';
        }
        if (controlName === 'confirm_password' && form.hasError('passwordMismatch')) {
            return 'Mật khẩu xác nhận không khớp';
        }

        return 'Giá trị không hợp lệ';
    }
}
