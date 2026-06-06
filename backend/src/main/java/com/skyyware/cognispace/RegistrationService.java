package com.skyyware.cognispace;

import java.time.Instant;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class RegistrationService {
    private final ObjectProvider<JavaMailSender> mailSender;
    private final String mailHost;
    private final String mailFrom;
    private final String notifyTo;

    public RegistrationService(
            ObjectProvider<JavaMailSender> mailSender,
            @Value("${spring.mail.host:}") String mailHost,
            @Value("${app.registration.mail-from:${spring.mail.username:admin@stage.dev}}") String mailFrom,
            @Value("${app.registration.notify-to:admin@stage.dev}") String notifyTo
    ) {
        this.mailSender = mailSender;
        this.mailHost = mailHost;
        this.mailFrom = mailFrom;
        this.notifyTo = notifyTo;
    }

    public RegistrationResponse register(RegistrationRequest request) {
        boolean emailSent = sendMail(request);
        return new RegistrationResponse("received", emailSent, Instant.now());
    }

    private boolean sendMail(RegistrationRequest request) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null || !StringUtils.hasText(mailHost)) {
            return false;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(notifyTo);
        message.setReplyTo(request.email());
        message.setSubject("[CogniSpace] Access request from " + request.company());
        message.setText(String.join("\n",
                "CogniSpace access request",
                "",
                "Name: " + request.name(),
                "Email: " + request.email(),
                "Company / team: " + request.company(),
                "Submitted: " + Instant.now(),
                "",
                "Use case:",
                request.useCase()
        ));

        try {
            sender.send(message);
            return true;
        } catch (RuntimeException exception) {
            return false;
        }
    }
}
