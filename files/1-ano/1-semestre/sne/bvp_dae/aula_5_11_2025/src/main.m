function main
    % ---------------------------
    %  Solução com grelha grossa
    % ---------------------------
    tic;   % iniciar cronómetro
    solinit1 = bvpinit(linspace(0.2, 0.5, 4), [0 0]);
    sol1 = bvp4c(@exerc1, @front1, solinit1);
    t1 = toc;   % tempo gasto

    % ---------------------------
    %  Solução com grelha refinada
    % ---------------------------
    tic;
    solinit2 = bvpinit(linspace(0.2, 0.5, 10), [0 0]);
    sol2 = bvp4c(@exerc1, @front1, solinit2);
    t2 = toc;

    % ---------------------------
    %  Interpolação para comparar soluções
    % ---------------------------
    x_common = linspace(0.2, 0.5, 50);   % grelha comum para comparação
    y1_interp = deval(sol1, x_common, 1);
    y2_interp = deval(sol2, x_common, 1);

    erro_max = max(abs(y1_interp - y2_interp));

    % ---------------------------
    %  Resultados no Command Window
    % ---------------------------
    fprintf('\n=== Comparação das duas grelhas ===\n');
    fprintf('Tempo (grelha com 4 pts interiores):  %.6f s\n', t1);
    fprintf('Tempo (grelha com 10 pts interiores): %.6f s\n', t2);
    fprintf('Diferença máxima entre as soluções:   %.6e\n', erro_max);

    % ---------------------------
    %  Gráfico comparativo
    % ---------------------------
    figure;
    plot(sol1.x, sol1.y(1,:), 'ro-', 'LineWidth', 1.5); hold on;
    plot(sol2.x, sol2.y(1,:), 'b--', 'LineWidth', 1.5);
    xlabel('x (unidade)');
    ylabel('y (unidade)');
    title('Comparação entre grelha grosseira e refinada');
    legend('4 pontos interiores', '10 pontos interiores', 'Location', 'best');
    grid on;
    hold off;
end

% --- Equação diferencial ---
function dydx = exerc1(x, y)
    dydx = [y(2); -2 - (1/x)*y(2)];
end

% --- Condições de fronteira ---
function res = front1(ya, yb)
    res = [ya(1); yb(1)];
end