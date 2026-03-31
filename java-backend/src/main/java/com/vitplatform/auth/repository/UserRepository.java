package com.vitplatform.auth.repository;

import com.vitplatform.auth.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByRegNo(String regNo);
}
