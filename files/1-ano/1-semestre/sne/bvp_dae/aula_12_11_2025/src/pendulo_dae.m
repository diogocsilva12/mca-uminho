function pendulo_dae
    % --------------------------------------------------------
    % Pêndulo simples – DAE de índice 1 (restrição em velocidades)
    % --------------------------------------------------------
    m = 1.0; l = 1.0; g = 9.81;
    theta0 = pi/6;

    % Condições iniciais aproximadas
    %y1_0 = l*sin(theta0);
    %y2_0 = l*cos(theta0);
    %y3_0 = 0.0; y4_0 = 0.0;
    %y5_0 = m*g*cos(theta0);
    y1_0 = sin(theta0);
    y2_0 = cos(theta0);
    y3_0 = 0.0; y4_0 = 0.0;
    y5_0 = cos(theta0);

    y0  = [y1_0; y2_0; y3_0; y4_0; y5_0];
% Derivadas iniciais coerentes (restrição de velocidade satisfeita)
    yp0 = [y3_0; y4_0; -y5_0*y1_0/(m*l); -y5_0*y2_0/(m*l) + g; 0];

% Função residual da DAE índice 1    
    F = @(t,y,yp) penduloEq(t,y,yp,m,l,g);
% Opções numéricas    
    opt = odeset('RelTol',1e-6,'AbsTol',1e-8);

% Integração com ODE15i     
    [t,y] = ode15i(F,[0 10],y0,yp0,opt);

% Resultados
    y1=y(:,1); y2=y(:,2); y3=y(:,3); y4=y(:,4); y5=y(:,5);

% Gráficos
   figure('Name','Pêndulo - DAE índice 1 (ode15i)','Color','w');
    subplot(3,1,1);
    plot(t,y1,t,y2,'LineWidth',1.5);
    legend('y_1 = X','y_2 = Y'); ylabel('Posição (m)'); grid on;

    subplot(3,1,2);
    plot(t,y3,t,y4,'LineWidth',1.5);
    legend('y_3 = U','y_4 = V'); ylabel('Velocidade (m/s)'); grid on;

    subplot(3,1,3);
    plot(t,y5,'k','LineWidth',1.5);
    ylabel('Tensão (N)'); xlabel('Tempo (s)'); legend('y_5 = T'); grid on;

end

function res = penduloEq(~,y,yp,m,l,g)
    % --------------------------------------------------------
    % Função residual F(t,y,yp) = 0 da DAE de índice 1
    % --------------------------------------------------------
    y  = y(:); yp = yp(:);

    % Variáveis
    y1=y(1); y2=y(2); y3=y(3); y4=y(4); y5=y(5);
    yp1=yp(1); yp2=yp(2); yp3=yp(3); yp4=yp(4);

    % Sistema
    res = zeros(5,1);
    res(1) = yp1 - y3;                    % dX/dt = U
    res(2) = yp2 - y4;                    % dY/dt = V
    res(3) = yp3 + y5*y1;                 % m*dU/dt + T*X/l = 0
    res(4) = yp4 + y5*y2 - 1;             % m*dV/dt + T*Y/l - mg = 0
    res(5) = y1*y3 + y2*y4;               % restrição em velocidades
end