package com.example.service;

import com.example.dto.DebtDTO;
import com.example.model.*;
import com.example.repository.DebtRepository;
import com.example.repository.GroupRepository;
import com.example.repository.TransactionRepository;
import com.example.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DebtService {
    private final DebtRepository debtRepository;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;

    public DebtService(DebtRepository debtRepository, GroupRepository groupRepository, UserRepository userRepository, TransactionRepository transactionRepository) {
        this.debtRepository = debtRepository;
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
    }

    public List<Debt> getGroupDebts(Long groupId) {
        return debtRepository.findByGroupId(groupId);
    }

    public Debt createDebt(DebtDTO debtDTO) {
        Group group = groupRepository.findById(debtDTO.getGroupId())
                .orElseThrow(() -> new EntityNotFoundException("Nie znaleziono grupy o ID: " + debtDTO.getGroupId()));
        User debtor = userRepository.findById(debtDTO.getDebtorId())
                .orElseThrow(() -> new EntityNotFoundException("NIe znaleziono dłużnika o ID: " + debtDTO.getDebtorId()));
        User creditor = userRepository.findById(debtDTO.getCreditorId())
                .orElseThrow(() -> new EntityNotFoundException("Nie znaleziono wierzyciela o ID: " + debtDTO.getCreditorId()));

        Debt debt = new Debt();
        debt.setGroup(group);
        debt.setDebtor(debtor);
        debt.setCreditor(creditor);
        debt.setAmount(debtDTO.getAmount());
        debt.setTitle(debtDTO.getTitle());

        return debtRepository.save(debt);
    }

    public void deleteDebt(Long debtId, User currentUser) {
        Debt debt = debtRepository.findById(debtId)
                .orElseThrow(() -> new EntityNotFoundException("Dług o ID : " + debtId + " nie istnieje."));

        if (!debt.getCreditor().getId().equals(currentUser.getId())) {
            throw new SecurityException("Tylko wierzyciel może usunąć ten dług");
        }
        debtRepository.delete(debt);
    }

    public boolean markAsPaid(Long debtId, User user) {
        Debt debt = debtRepository.findById(debtId)
                .orElseThrow(() -> new EntityNotFoundException("NIe znaleziono długu"));
        if (!debt.getDebtor().getId().equals(user.getId())) {
            throw new SecurityException("Nie jesteś dłużnikiem");
        }
        debt.setMarkedAsPaid(true);
        debtRepository.save(debt);
        return true;
    }

    public boolean confirmPayment(Long debtId, User user) {
        Debt debt = debtRepository.findById(debtId)
                .orElseThrow(() -> new EntityNotFoundException("Nie znaleziono długu"));
        if (!debt.getCreditor().getId().equals(user.getId())) {
            throw new SecurityException("Nie jesteś wierzycielem");
        }
        if (!debt.isMarkedAsPaid()) {
            throw new IllegalStateException("Dłużnik jeszcze nie oznaczył jako opłacone");
        }
        debt.setConfirmedByCreditor(true);
        debtRepository.save(debt);

        Transaction incomeTx = new Transaction(
                debt.getAmount(),
                TransactionType.INCOME,
                "Spłata długu",
                "Spłata długu od: " + debt.getDebtor().getEmail(),
                debt.getCreditor()
        );
        transactionRepository.save(incomeTx);
        Transaction expenseTx = new Transaction(
                debt.getAmount(),
                TransactionType.EXPENSE,
                "Spłata długu",
                "Spłata długu dla: " + debt.getCreditor().getEmail(),
                debt.getDebtor()
        );
        transactionRepository.save(expenseTx);
        return true;
    }
}
