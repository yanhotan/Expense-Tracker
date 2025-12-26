package com.expensetracker;

import com.expensetracker.model.Expense;
import com.expensetracker.model.ExpenseSheet;
import com.expensetracker.model.User;
import com.expensetracker.repository.ExpenseRepository;
import com.expensetracker.repository.ExpenseSheetRepository;
import com.expensetracker.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class ApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExpenseSheetRepository sheetRepository;

    @Autowired
    private ExpenseRepository expenseRepository;

    private User testUser;
    private ExpenseSheet testSheet;
    private String jwtToken;

    @BeforeEach
    void setUp() {
        // Create test user
        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("test@example.com");
        testUser.setName("Test User");
        testUser.setGoogleId("test_google_id");
        testUser.setPicture("https://example.com/picture.jpg");
        userRepository.save(testUser);

        // Create test sheet
        testSheet = new ExpenseSheet();
        testSheet.setId(UUID.randomUUID());
        testSheet.setName("Test Sheet");
        testSheet.setUserId(testUser.getId());
        testSheet.setPin("1234");
        testSheet.setHasPin(true);
        sheetRepository.save(testSheet);

        // Mock JWT token for testing
        jwtToken = "Bearer mock.jwt.token.for.testing";
    }

    @Test
    public void healthEndpoint_ShouldReturnOk() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    public void sheetsEndpoint_WithoutAuth_ShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/sheets"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "test@example.com")
    public void sheetsEndpoint_WithAuth_ShouldReturnSheets() throws Exception {
        mockMvc.perform(get("/api/sheets")
                .header("Authorization", jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", isA(java.util.List.class)));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    public void createSheet_ShouldReturnCreatedSheet() throws Exception {
        ExpenseSheet newSheet = new ExpenseSheet();
        newSheet.setName("New Test Sheet");
        newSheet.setUserId(testUser.getId());
        newSheet.setPin("5678");
        newSheet.setHasPin(true);

        mockMvc.perform(post("/api/sheets")
                .header("Authorization", jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newSheet)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name").value("New Test Sheet"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    public void getSheetById_ShouldReturnSheet() throws Exception {
        mockMvc.perform(get("/api/sheets/{id}", testSheet.getId())
                .header("Authorization", jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testSheet.getId().toString()))
                .andExpect(jsonPath("$.name").value("Test Sheet"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    public void updateSheet_ShouldReturnUpdatedSheet() throws Exception {
        mockMvc.perform(put("/api/sheets/{id}", testSheet.getId())
                .header("Authorization", jwtToken)
                .param("name", "Updated Sheet Name"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Sheet Name"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    public void verifySheetPin_ShouldReturnValidStatus() throws Exception {
        mockMvc.perform(post("/api/sheets/{id}/verify-pin", testSheet.getId())
                .header("Authorization", jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pin\": \"1234\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    public void expensesEndpoint_ShouldReturnExpenses() throws Exception {
        mockMvc.perform(get("/api/expenses")
                .header("Authorization", jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", isA(java.util.List.class)));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    public void createExpense_ShouldReturnCreatedExpense() throws Exception {
        Expense newExpense = new Expense();
        newExpense.setDate(LocalDate.now());
        newExpense.setAmount(new BigDecimal("25.50"));
        newExpense.setCategory("Food");
        newExpense.setDescription("Test expense");
        newExpense.setSheet(testSheet);
        newExpense.setUserId(testUser.getId());

        mockMvc.perform(post("/api/expenses")
                .header("Authorization", jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newExpense)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.amount").value(25.50));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    public void getExpensesBySheetId_ShouldReturnFilteredExpenses() throws Exception {
        mockMvc.perform(get("/api/expenses")
                .header("Authorization", jwtToken)
                .param("sheetId", testSheet.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", isA(java.util.List.class)));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    public void analyticsEndpoint_ShouldReturnAnalytics() throws Exception {
        mockMvc.perform(get("/api/analytics")
                .header("Authorization", jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categoryTotals").exists())
                .andExpect(jsonPath("$.monthlyTotals").exists());
    }

    @Test
    @WithMockUser(username = "test@example.com")
    public void categoriesEndpoint_ShouldReturnCategories() throws Exception {
        mockMvc.perform(get("/api/categories")
                .header("Authorization", jwtToken)
                .param("sheetId", testSheet.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", isA(java.util.List.class)));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    public void createCategory_ShouldReturnCreatedCategory() throws Exception {
        mockMvc.perform(post("/api/categories")
                .header("Authorization", jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(String.format("{\"sheetId\": \"%s\", \"category\": \"Test Category\"}", testSheet.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("Test Category"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    public void descriptionsEndpoint_ShouldReturnDescriptions() throws Exception {
        mockMvc.perform(get("/api/descriptions")
                .header("Authorization", jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", isA(java.util.List.class)));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    public void corsHeaders_ShouldBePresent() throws Exception {
        mockMvc.perform(options("/api/sheets")
                .header("Origin", "http://localhost:3000")
                .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Access-Control-Allow-Origin"))
                .andExpect(header().exists("Access-Control-Allow-Methods"));
    }

    @Test
    public void authEndpoints_ShouldBeAccessibleWithoutAuth() throws Exception {
        // Test that auth endpoints are accessible without authentication
        mockMvc.perform(post("/api/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"idToken\": \"test_token\"}"))
                .andExpect(status().isBadRequest()); // Should fail due to invalid token, but endpoint accessible
    }
}