import assert from 'node:assert/strict';
import test from 'node:test';
import {createPasswordResetMailer} from '../server/passwordResetEmail.mjs';

const mailEnv = {
  SMTP_HOST: 'smtp.example.test',
  SMTP_PORT: '587',
  SMTP_USER: 'mailer@example.test',
  SMTP_PASS: 'smtp-test-password',
  PASSWORD_RESET_FROM: 'Deluxe Tunes <mailer@example.test>',
  PASSWORD_RESET_BASE_URL: 'https://deluxetunes.example',
};

test('password reset mailer requires SMTP credentials and a reset-link base URL', () => {
  assert.equal(createPasswordResetMailer({}), null);
  assert.throws(
    () => createPasswordResetMailer({...mailEnv, PASSWORD_RESET_BASE_URL: 'http://example.test'}),
    /must use HTTPS outside localhost/
  );
});

test('password reset email links to the app with the one-time token', async () => {
  let transportOptions;
  let sentMessage;
  const mailer = createPasswordResetMailer(mailEnv, {
    createTransport(options) {
      transportOptions = options;
      return {async sendMail(message) { sentMessage = message; }};
    },
  });

  await mailer.sendPasswordReset({email: 'existing@example.com', token: 'A'.repeat(43)});

  assert.equal(transportOptions.host, mailEnv.SMTP_HOST);
  assert.equal(transportOptions.port, 587);
  assert.equal(transportOptions.secure, false);
  assert.equal(transportOptions.auth.pass, mailEnv.SMTP_PASS);
  assert.equal(sentMessage.to, 'existing@example.com');
  assert.equal(sentMessage.from, mailEnv.PASSWORD_RESET_FROM);
  assert.match(sentMessage.text, /https:\/\/deluxetunes\.example\/app\.html#resetToken=A{43}/);
  assert.match(sentMessage.html, /Reset your password/);
  assert.match(sentMessage.text, /within 30 minutes/);
});
