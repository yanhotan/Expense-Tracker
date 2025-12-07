# 🚀 Expense Tracker: Comprehensive Spring Boot Migration Plan

## 📋 Executive Summary

This document outlines a comprehensive, concrete plan to migrate the Expense Tracker application from its current Next.js API routes + Supabase architecture to a robust Java Spring Boot backend with PostgreSQL database, while maintaining the existing React frontend.

**Current Architecture:** React (Next.js) → Next.js API Routes → Supabase (PostgreSQL)  
**Target Architecture:** React (Next.js) → Spring Boot REST API → PostgreSQL

---

## 🎯 Project Overview

### Current System Analysis
- **Frontend:** Next.js with React, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes (currently used)
- **Database:** Supabase (PostgreSQL with Row Level Security)
- **Authentication:** Supabase Auth (currently disabled)
- **Data:** 277 records across 4 tables (expense_sheets, expenses, sheet_categories, column_descriptions)

### Target Architecture Benefits
- **Separation of Concerns:** Clear backend/frontend separation
- **Scalability:** Independent scaling of services
- **Security:** Proper authentication and authorization
- **Performance:** Optimized database queries and caching
- **Maintainability:** Clean architecture with proper testing
- **Technology Stack:** Industry-standard Spring Boot ecosystem

---

## 📊 Phase-by-Phase Migration Plan

### Phase 1: Foundation & Infrastructure Setup (Week 1-2)

#### 1.1 Project Structure Setup
**Goal:** Create Spring Boot project structure and basic configuration

**Tasks:**
- [ ] Create new directory: `/backend-springboot`
- [ ] Initialize Spring Boot project with Spring Initializr
  - Project: Maven Project
  - Language: Java 17
  - Spring Boot: 3.2.x
  - Dependencies:
    - Spring Web
    - Spring Data JPA
    - PostgreSQL Driver
    - Spring Security
    - JWT (Java JWT)
    - Validation
    - Spring Boot DevTools
    - Lombok
    - Spring Boot Test
    - JUnit 5
    - H2 Database (for testing)
- [ ] Set up Git repository and initial commit
- [ ] Configure Maven wrapper (`./mvnw`)
- [ ] Create basic package structure:
  ```
  src/main/java/com/expensetracker/
  ├── config/
  ├── controller/
  ├── service/
  ├── repository/
  ├── model/
  ├── dto/
  ├── exception/
  ├── security/
  └── util/
  ```

#### 1.2 Database Configuration
**Goal:** Set up PostgreSQL connection and initial schema

**Tasks:**
- [ ] Install PostgreSQL locally or use cloud instance
- [ ] Create database: `expense_tracker`
- [ ] Configure `application.properties`:
  ```properties
  # Database Configuration
  spring.datasource.url=jdbc:postgresql://localhost:5432/expense_tracker
  spring.datasource.username=expensetracker
  spring.datasource.password=your_password
  spring.datasource.driver-class-name=org.postgresql.Driver

  # JPA Configuration
  spring.jpa.hibernate.ddl-auto=validate
  spring.jpa.show-sql=true
  spring.jpa.properties.hibernate.format_sql=true
  spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect

  # JWT Configuration
  jwt.secret=your_jwt_secret_key_here
  jwt.expiration=86400000

  # Server Configuration
  server.port=8080
  server.servlet.context-path=/api
  ```
- [ ] Create database schema migration scripts using Flyway
- [ ] Set up connection pooling (HikariCP - default in Spring Boot)

#### 1.3 Core Entity Models
**Goal:** Create JPA entity classes matching current schema

**Tasks:**
- [ ] Create `ExpenseSheet` entity:
  ```java
  @Entity
  @Table(name = "expense_sheets")
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public class ExpenseSheet {
      @Id
      @GeneratedValue(strategy = GenerationType.UUID)
      private UUID id;

      @Column(nullable = false)
      private String name;

      private String pin;

      @Column(name = "has_pin")
      private Boolean hasPin = false;

      @Column(name = "user_id", nullable = false)
      private UUID userId;

      @Column(name = "created_at")
      private LocalDateTime createdAt;

      @OneToMany(mappedBy = "sheet", cascade = CascadeType.ALL)
      private List<Expense> expenses;

      @OneToMany(mappedBy = "sheet", cascade = CascadeType.ALL)
      private List<SheetCategory> categories;
  }
  ```

- [ ] Create `Expense` entity:
  ```java
  @Entity
  @Table(name = "expenses")
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public class Expense {
      @Id
      @GeneratedValue(strategy = GenerationType.UUID)
      private UUID id;

      @Column(nullable = false)
      private LocalDate date;

      @Column(nullable = false, precision = 10, scale = 2)
      private BigDecimal amount;

      @Column(nullable = false)
      private String category;

      private String description;

      @Column(name = "user_id", nullable = false)
      private UUID userId;

      @ManyToOne(fetch = FetchType.LAZY)
      @JoinColumn(name = "sheet_id")
      private ExpenseSheet sheet;

      @Column(name = "created_at")
      private LocalDateTime createdAt;

      @OneToMany(mappedBy = "expense", cascade = CascadeType.ALL)
      private List<ColumnDescription> descriptions;
  }
  ```

- [ ] Create `SheetCategory` entity
- [ ] Create `ColumnDescription` entity
- [ ] Add proper indexes and constraints

#### 1.4 Repository Layer
**Goal:** Set up Spring Data JPA repositories

**Tasks:**
- [ ] Create `ExpenseSheetRepository`:
  ```java
  public interface ExpenseSheetRepository extends JpaRepository<ExpenseSheet, UUID> {
      List<ExpenseSheet> findByUserId(UUID userId);
      Optional<ExpenseSheet> findByIdAndUserId(UUID id, UUID userId);
  }
  ```

- [ ] Create `ExpenseRepository` with custom queries:
  ```java
  public interface ExpenseRepository extends JpaRepository<Expense, UUID> {
      List<Expense> findByUserIdAndSheetId(UUID userId, UUID sheetId);
      List<Expense> findByUserIdAndDateBetween(UUID userId, LocalDate start, LocalDate end);
      @Query("SELECT SUM(e.amount) FROM Expense e WHERE e.userId = :userId AND e.sheet.id = :sheetId")
      BigDecimal getTotalBySheet(@Param("userId") UUID userId, @Param("sheetId") UUID sheetId);
  }
  ```

- [ ] Create `SheetCategoryRepository`
- [ ] Create `ColumnDescriptionRepository`

### Phase 2: Security & Authentication (Week 3)

#### 2.1 JWT Authentication Setup
**Goal:** Implement secure authentication system

**Tasks:**
- [ ] Create `JwtUtil` class for token generation/validation
- [ ] Create `JwtAuthenticationFilter` for request processing
- [ ] Configure Spring Security:
  ```java
  @Configuration
  @EnableWebSecurity
  public class SecurityConfig {
      @Bean
      public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
          http.csrf().disable()
              .authorizeHttpRequests(auth -> auth
                  .requestMatchers("/api/auth/**").permitAll()
                  .anyRequest().authenticated()
              )
              .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
              .and()
              .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

          return http.build();
      }
  }
  ```

- [ ] Create `User` entity for authentication
- [ ] Implement login/register endpoints
- [ ] Add password encryption with BCrypt

#### 2.2 Authorization & User Context
**Goal:** Implement proper user-based authorization

**Tasks:**
- [ ] Create `UserContext` service for current user retrieval
- [ ] Add `@PreAuthorize` annotations to controllers
- [ ] Implement method-level security
- [ ] Create custom authorization aspects

### Phase 3: REST API Development (Week 4-6)

#### 3.1 DTO Layer
**Goal:** Create Data Transfer Objects for API responses

**Tasks:**
- [ ] Create request/response DTOs:
  ```java
  // Request DTOs
  @Data
  public class CreateExpenseRequest {
      @NotNull @PastOrPresent
      private LocalDate date;

      @NotNull @DecimalMin("0.01")
      private BigDecimal amount;

      @NotBlank
      private String category;

      private String description;

      @NotNull
      private UUID sheetId;
  }

  // Response DTOs
  @Data
  public class ExpenseResponse {
      private UUID id;
      private LocalDate date;
      private BigDecimal amount;
      private String category;
      private String description;
      private UUID sheetId;
      private LocalDateTime createdAt;
  }
  ```

- [ ] Implement DTO mapping with MapStruct
- [ ] Add validation annotations
- [ ] Create pagination DTOs

#### 3.2 Controller Layer
**Goal:** Implement REST endpoints matching current API

**Tasks:**
- [ ] Create `ExpenseController`:
  ```java
  @RestController
  @RequestMapping("/expenses")
  @RequiredArgsConstructor
  public class ExpenseController {

      private final ExpenseService expenseService;

      @GetMapping
      public ResponseEntity<Page<ExpenseResponse>> getExpenses(
              @RequestParam(required = false) UUID sheetId,
              @RequestParam(required = false) String month,
              @RequestParam(required = false) String year,
              @RequestParam(defaultValue = "0") int page,
              @RequestParam(defaultValue = "20") int size) {

          Pageable pageable = PageRequest.of(page, size);
          Page<ExpenseResponse> expenses = expenseService.getExpenses(
              getCurrentUserId(), sheetId, month, year, pageable);

          return ResponseEntity.ok(expenses);
      }

      @PostMapping
      public ResponseEntity<ExpenseResponse> createExpense(
              @Valid @RequestBody CreateExpenseRequest request) {

          ExpenseResponse expense = expenseService.createExpense(
              getCurrentUserId(), request);

          return ResponseEntity.status(HttpStatus.CREATED).body(expense);
      }
  }
  ```

- [ ] Create `ExpenseSheetController`
- [ ] Create `CategoryController`
- [ ] Create `AnalyticsController`
- [ ] Add proper HTTP status codes and error handling

#### 3.3 Service Layer
**Goal:** Implement business logic services

**Tasks:**
- [ ] Create `ExpenseService` with business logic:
  ```java
  @Service
  @RequiredArgsConstructor
  public class ExpenseService {

      private final ExpenseRepository expenseRepository;
      private final ExpenseMapper expenseMapper;

      @Transactional(readOnly = true)
      public Page<ExpenseResponse> getExpenses(UUID userId, UUID sheetId,
              String month, String year, Pageable pageable) {

          // Complex filtering logic
          Specification<Expense> spec = createSpecification(userId, sheetId, month, year);
          Page<Expense> expenses = expenseRepository.findAll(spec, pageable);

          return expenses.map(expenseMapper::toResponse);
      }

      @Transactional
      public ExpenseResponse createExpense(UUID userId, CreateExpenseRequest request) {
          // Duplicate checking logic
          checkForDuplicateExpense(userId, request);

          Expense expense = expenseMapper.toEntity(request);
          expense.setUserId(userId);

          Expense saved = expenseRepository.save(expense);
          return expenseMapper.toResponse(saved);
      }
  }
  ```

- [ ] Create `AnalyticsService` for complex calculations
- [ ] Implement caching with Redis (future enhancement)
- [ ] Add transactional boundaries

#### 3.4 Exception Handling
**Goal:** Implement comprehensive error handling

**Tasks:**
- [ ] Create custom exception classes:
  ```java
  public class ResourceNotFoundException extends RuntimeException {
      public ResourceNotFoundException(String resource, UUID id) {
          super(String.format("%s not found with id: %s", resource, id));
      }
  }

  public class DuplicateResourceException extends RuntimeException {
      public DuplicateResourceException(String message) {
          super(message);
      }
  }
  ```

- [ ] Create `GlobalExceptionHandler`:
  ```java
  @RestControllerAdvice
  public class GlobalExceptionHandler {

      @ExceptionHandler(ResourceNotFoundException.class)
      public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
          ErrorResponse error = new ErrorResponse("NOT_FOUND", ex.getMessage());
          return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
      }

      @ExceptionHandler(DuplicateResourceException.class)
      public ResponseEntity<ErrorResponse> handleDuplicate(DuplicateResourceException ex) {
          ErrorResponse error = new ErrorResponse("DUPLICATE_RESOURCE", ex.getMessage());
          return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
      }
  }
  ```

### Phase 4: Testing & Quality Assurance (Week 7-8)

#### 4.1 Unit Testing
**Goal:** Implement comprehensive unit tests

**Tasks:**
- [ ] Set up JUnit 5 and Mockito
- [ ] Create repository tests with `@DataJpaTest`
- [ ] Create service layer tests with mocking
- [ ] Create controller tests with `@WebMvcTest`
- [ ] Implement test data factories
- [ ] Achieve 80%+ code coverage

#### 4.2 Integration Testing
**Goal:** Test complete request flows

**Tasks:**
- [ ] Set up Testcontainers for database testing
- [ ] Create integration tests with `@SpringBootTest`
- [ ] Test authentication flows
- [ ] Test CRUD operations end-to-end
- [ ] Implement API contract testing

#### 4.3 Performance Testing
**Goal:** Ensure system performance meets requirements

**Tasks:**
- [ ] Load testing with JMeter
- [ ] Database query optimization
- [ ] Implement database indexes
- [ ] Add query result caching
- [ ] Performance monitoring setup

### Phase 5: Frontend Integration & Migration (Week 9-10)

#### 5.1 API Client Update
**Goal:** Update frontend to use Spring Boot API

**Tasks:**
- [ ] Update `lib/api.ts` to point to Spring Boot:
  ```typescript
  const API_BASE = 'http://localhost:8080/api';
  ```

- [ ] Update request headers to include JWT tokens:
  ```typescript
  const apiRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const token = localStorage.getItem('jwt_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 401 responses (token expired)
    if (response.status === 401) {
      localStorage.removeItem('jwt_token');
      window.location.href = '/login';
      throw new Error('Authentication required');
    }

    return response.json();
  };
  ```

- [ ] Update error handling for new error response format
- [ ] Migrate authentication logic to JWT-based system

#### 5.2 Authentication UI
**Goal:** Implement login/register UI components

**Tasks:**
- [ ] Create login/register forms
- [ ] Implement JWT token storage and refresh
- [ ] Add authentication state management
- [ ] Create protected route components
- [ ] Update user context hooks

#### 5.3 Data Migration
**Goal:** Migrate existing data to new system

**Tasks:**
- [ ] Create data export script from Supabase
- [ ] Create data import script for Spring Boot API
- [ ] Validate data integrity during migration
- [ ] Update user IDs to match new authentication system
- [ ] Test all features with migrated data

### Phase 6: Deployment & Production (Week 11-12)

#### 6.1 Docker & Containerization
**Goal:** Containerize the application for deployment

**Tasks:**
- [ ] Create `Dockerfile` for Spring Boot:
  ```dockerfile
  FROM openjdk:17-jdk-slim
  WORKDIR /app
  COPY target/*.jar app.jar
  EXPOSE 8080
  ENTRYPOINT ["java","-jar","app.jar"]
  ```

- [ ] Create `docker-compose.yml` for full stack:
  ```yaml
  version: '3.8'
  services:
    postgres:
      image: postgres:15
      environment:
        POSTGRES_DB: expense_tracker
        POSTGRES_USER: expensetracker
        POSTGRES_PASSWORD: password
      volumes:
        - postgres_data:/var/lib/postgresql/data
      ports:
        - "5432:5432"

    springboot:
      build: .
      ports:
        - "8080:8080"
      depends_on:
        - postgres
      environment:
        SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/expense_tracker
  ```

- [ ] Set up Docker Compose for development
- [ ] Configure production Docker setup

#### 6.2 CI/CD Pipeline
**Goal:** Implement automated deployment

**Tasks:**
- [ ] Set up GitHub Actions workflow:
  ```yaml
  name: CI/CD Pipeline
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - uses: actions/setup-java@v3
          with:
            java-version: '17'
            distribution: 'temurin'
        - run: ./mvnw test
    build:
      needs: test
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - uses: actions/setup-java@v3
          with:
            java-version: '17'
            distribution: 'temurin'
        - run: ./mvnw clean package -DskipTests
        - uses: actions/upload-artifact@v3
          with:
            name: jar-file
            path: target/*.jar
  ```

- [ ] Set up deployment to cloud platform (Heroku/AWS/GCP)
- [ ] Configure environment-specific properties
- [ ] Implement database migrations for production

#### 6.3 Monitoring & Logging
**Goal:** Set up production monitoring

**Tasks:**
- [ ] Configure Spring Boot Actuator for health checks
- [ ] Set up structured logging with Logback
- [ ] Implement application metrics
- [ ] Add error tracking (Sentry)
- [ ] Set up log aggregation (ELK stack)

---

## 📈 Success Metrics & KPIs

### Technical Metrics
- **API Response Time:** < 200ms for 95% of requests
- **Test Coverage:** > 80% code coverage
- **Uptime:** > 99.5% availability
- **Error Rate:** < 1% of total requests

### Business Metrics
- **User Experience:** No degradation in UI responsiveness
- **Data Integrity:** 100% data preservation during migration
- **Development Velocity:** Maintain current feature development pace
- **Cost Efficiency:** Reduce infrastructure costs by 20%

---

## 🛠️ Technology Stack Details

### Backend (Spring Boot)
- **Framework:** Spring Boot 3.2.x
- **Language:** Java 17
- **Database:** PostgreSQL 15
- **ORM:** Spring Data JPA + Hibernate
- **Security:** Spring Security + JWT
- **Validation:** Bean Validation (Hibernate Validator)
- **Documentation:** OpenAPI/Swagger
- **Testing:** JUnit 5 + Mockito + Testcontainers

### DevOps & Infrastructure
- **Containerization:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Database Migrations:** Flyway
- **Monitoring:** Spring Boot Actuator
- **Logging:** SLF4J + Logback

### Frontend (Maintained)
- **Framework:** Next.js 15 + React 18
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Query + Context
- **API Client:** Fetch API with custom wrapper

---

## ⚠️ Risk Assessment & Mitigation

### High Risk Items
1. **Data Migration Complexity**
   - **Mitigation:** Comprehensive testing, backup verification, rollback plan

2. **Authentication System Changes**
   - **Mitigation:** Gradual rollout, maintain Supabase auth as fallback

3. **API Contract Changes**
   - **Mitigation:** Maintain backward compatibility, comprehensive API testing

### Medium Risk Items
1. **Performance Impact**
   - **Mitigation:** Load testing, database optimization, caching strategy

2. **Development Timeline**
   - **Mitigation:** Phased approach, MVP-first delivery, iterative improvements

---

## 📋 Detailed TODO Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Spring Boot project structure
- [ ] Configure PostgreSQL database
- [ ] Create JPA entities (Expense, ExpenseSheet, etc.)
- [ ] Implement repository layer
- [ ] Set up basic project configuration

### Phase 2: Security (Week 3)
- [ ] Implement JWT authentication
- [ ] Configure Spring Security
- [ ] Create User entity and authentication endpoints
- [ ] Add password encryption

### Phase 3: API Development (Week 4-6)
- [ ] Create DTO layer with validation
- [ ] Implement REST controllers
- [ ] Develop service layer with business logic
- [ ] Add comprehensive error handling
- [ ] Implement analytics endpoints

### Phase 4: Testing (Week 7-8)
- [ ] Write unit tests (repositories, services, controllers)
- [ ] Implement integration tests
- [ ] Performance testing and optimization
- [ ] API contract testing

### Phase 5: Frontend Integration (Week 9-10)
- [ ] Update API client to use Spring Boot endpoints
- [ ] Implement JWT-based authentication in frontend
- [ ] Migrate existing data
- [ ] Update error handling and loading states

### Phase 6: Production Deployment (Week 11-12)
- [ ] Docker containerization
- [ ] CI/CD pipeline setup
- [ ] Production deployment configuration
- [ ] Monitoring and logging setup

---

## 🚀 Migration Benefits

### Immediate Benefits
- **Scalability:** Independent backend scaling
- **Security:** Proper authentication and authorization
- **Performance:** Optimized database queries
- **Maintainability:** Clean separation of concerns

### Long-term Benefits
- **Technology Stack:** Industry-standard Spring Boot ecosystem
- **Team Productivity:** Familiar Java/Spring development
- **Feature Velocity:** Faster backend development cycles
- **Cost Efficiency:** Better resource utilization

---

## 📞 Support & Communication Plan

### Weekly Checkpoints
- **Monday:** Sprint planning and task assignment
- **Wednesday:** Mid-week progress review
- **Friday:** End-of-week demo and retrospective

### Communication Channels
- **Daily Standups:** 15-minute sync calls
- **Documentation:** Comprehensive README and API docs
- **Issue Tracking:** GitHub Issues with detailed descriptions
- **Code Reviews:** Mandatory for all pull requests

### Success Criteria
- [ ] All API endpoints functional and tested
- [ ] Data migration completed with 100% integrity
- [ ] Frontend fully integrated with new backend
- [ ] Performance benchmarks met
- [ ] Comprehensive test coverage achieved
- [ ] Production deployment successful

---

*This migration plan provides a comprehensive roadmap for transforming the Expense Tracker into a robust, scalable application with modern Java Spring Boot backend architecture.*
