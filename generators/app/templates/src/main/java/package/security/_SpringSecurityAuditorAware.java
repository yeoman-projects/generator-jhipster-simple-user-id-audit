package <%=packageName%>.security;

import <%=packageName%>.config.Constants;

import <%=packageName%>.domain.User;
import <%=packageName%>.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.AuditorAware;
import org.springframework.stereotype.Component;

/**
 * Implementation of AuditorAware based on Spring Security.
 */
@Component
public class SpringSecurityAuditorAware implements AuditorAware<Long> {
    @Autowired
    UserRepository userRepository;

    @Override
    public Long getCurrentAuditor() {
        String login = SecurityUtils.getCurrentUserLogin().orElse(Constants.SYSTEM_ACCOUNT);
        return userRepository.findOneWithAuthoritiesByLogin(login).map(User::getId).orElse(1L);
    }
}
